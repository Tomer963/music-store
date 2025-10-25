import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES } from "../config/constants.js";
import { 
  formatResponse, 
  calculateTotal,
  validateRequiredFields,
  sanitizeObject,
  parseQueryParams
} from "../utils/helpers.js";
import { 
  asyncHandler, 
  NotFoundError, 
  BadRequestError,
  ForbiddenError,
  assertFound,
  assertAuthorized 
} from "../middleware/errorHandler.js";

/**
 * validateBillingInfo
 *
 * Validates billing information completeness
 *
 * @param {Object} billingInfo - Billing information object
 * @throws {BadRequestError} If billing info is incomplete
 */
const validateBillingInfo = (billingInfo) => {
  const requiredFields = ["address", "city", "zipCode", "phone"];
  const missingFields = requiredFields.filter((field) => !billingInfo?.[field]);

  if (missingFields.length > 0) {
    throw new BadRequestError(
      `Missing billing information: ${missingFields.join(", ")}`
    );
  }
};

/**
 * validateCartItems
 *
 * Validates cart items stock availability and prepares order items
 *
 * @param {Array} cartItems - Cart items array
 * @return {Object} Order items and calculated total
 * @throws {BadRequestError} If cart is empty or stock unavailable
 */
const validateCartItems = async (cartItems) => {
  if (cartItems.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  const orderItems = [];
  let calculatedTotal = 0;

  for (const cartItem of cartItems) {
    if (!cartItem.album.canPurchase(cartItem.quantity)) {
      throw new BadRequestError(
        `${cartItem.album.title} is out of stock or insufficient quantity available`
      );
    }

    orderItems.push({
      album: cartItem.album._id,
      quantity: cartItem.quantity,
      price: cartItem.album.price,
    });

    calculatedTotal += cartItem.album.price * cartItem.quantity;
  }

  return { orderItems, calculatedTotal };
};

/**
 * updateAlbumStocks
 *
 * Updates stock for all albums in order
 *
 * @param {Array} cartItems - Cart items to update stock for
 */
const updateAlbumStocks = async (cartItems) => {
  await Promise.all(
    cartItems.map((item) => item.album.updateStock(item.quantity))
  );
};

/**
 * restoreAlbumStocks
 *
 * Restores stock for all items in order (used when deleting order)
 *
 * @param {Array} orderItems - Order items to restore stock for
 */
const restoreAlbumStocks = async (orderItems) => {
  for (const item of orderItems) {
    if (item.album) {
      item.album.stock += item.quantity;
      if (!item.album.availability && item.album.stock > 0) {
        item.album.availability = true;
      }
      await item.album.save();
    }
  }
};

/**
 * checkOrderOwnership
 *
 * Checks if user owns order or is admin
 *
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @throws {ForbiddenError} If user doesn't own order and isn't admin
 */
const checkOrderOwnership = (order, user) => {
  const isOwner = order.user.equals(user._id);
  const isAdmin = user.role === "admin";

  assertAuthorized(
    isOwner || isAdmin,
    "You don't have permission to access this order"
  );
};

/**
 * getOrders
 *
 * Retrieves all orders for the authenticated user
 */
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("items.album")
    .sort("-createdAt");

  res.json(formatResponse(true, "Orders retrieved", orders));
});

/**
 * getAllOrders
 *
 * Retrieves all orders in the system with pagination (Admin only)
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit } = parseQueryParams(req.query, { limit: 20 });
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find()
      .populate("items.album")
      .populate("user", "firstName lastName email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Order.countDocuments(),
  ]);

  res.json(
    formatResponse(true, "All orders retrieved", {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * getOrder
 *
 * Retrieves a single order by ID with authorization check
 */
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.album")
    .populate("user", "firstName lastName email");

  assertFound(order, "Order");
  checkOrderOwnership(order, req.user);

  res.json(formatResponse(true, "Order retrieved", order));
});

/**
 * createOrder
 *
 * Creates a new order from cart items with validation and stock updates
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, billingInfo, totalAmount } = req.body;

  // Validate required fields
  validateRequiredFields(
    { paymentMethod, billingInfo, totalAmount },
    ["paymentMethod", "billingInfo", "totalAmount"]
  );

  // Validate billing information
  validateBillingInfo(billingInfo);

  // Get and validate cart items
  const cartItems = await CartItem.find({ user: req.user._id }).populate("album");
  const { orderItems, calculatedTotal } = await validateCartItems(cartItems);

  // Create the order
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalAmount: calculatedTotal,
    paymentMethod,
    paymentInfo: {},
    billingInfo,
  });

  // Update stock and clear cart
  await Promise.all([
    updateAlbumStocks(cartItems),
    CartItem.deleteMany({ user: req.user._id }),
  ]);

  await order.populate("items.album");

  res.status(201).json(
    formatResponse(true, "Order created successfully", order)
  );
});

/**
 * updateOrder
 *
 * Updates order details with protection for critical fields (Admin only)
 */
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  assertFound(order, "Order");

  // Remove protected fields
  const updates = sanitizeObject(req.body, [
    "user",
    "orderNumber",
    "createdAt",
  ]);

  // Recalculate total if items are updated
  if (updates.items) {
    updates.totalAmount = calculateTotal(updates.items);
  }

  // Apply updates
  Object.assign(order, updates);
  await order.save();

  await order.populate([
    { path: "items.album" },
    { path: "user", select: "firstName lastName email" },
  ]);

  res.json(formatResponse(true, "Order updated successfully", order));
});

/**
 * deleteOrder
 *
 * Permanently deletes an order and restores stock (Admin only)
 */
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("items.album");
  assertFound(order, "Order");

  // Restore stock before deleting
  await restoreAlbumStocks(order.items);
  await order.deleteOne();

  res.json(formatResponse(true, "Order deleted successfully"));
});

/**
 * getOrderStatistics
 *
 * Retrieves order statistics including total count and revenue (Admin only)
 */
export const getOrderStatistics = asyncHandler(async (req, res) => {
  const [totalOrders, revenueResult] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]),
  ]);

  const stats = revenueResult[0] || {
    totalRevenue: 0,
    averageOrderValue: 0,
  };

  res.json(
    formatResponse(true, "Order statistics retrieved", {
      totalOrders,
      totalRevenue: stats.totalRevenue,
      averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100,
    })
  );
});