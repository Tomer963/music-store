import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES } from "../config/constants.js";
import {
  formatResponse,
  calculateTotal,
  validateRequiredFields,
  sanitizeObject,
  parseQueryParams,
} from "../utils/helpers.js";
import {
  asyncHandler,
  BadRequestError,
  assertFound,
  assertAuthorized,
} from "../middleware/errorHandler.js";

/**
 * validateBillingInfo
 *
 * Validate billing information completeness
 *
 * @param {Object} billingInfo - Billing information object
 * @throws {BadRequestError} If required fields are missing
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
 * Validate cart items and prepare order data
 *
 * @param {Array} cartItems - Array of cart items with populated albums
 * @return {Object} Order items and calculated total
 * @throws {BadRequestError} If cart is empty or stock unavailable
 */
const validateCartItems = async (cartItems) => {
  if (cartItems.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  const orderItems = [];
  let calculatedTotal = 0;

  // Validate each item and build order items array
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
 * Reduce stock for all albums in order
 *
 * @param {Array} cartItems - Cart items to update stock for
 * @return {Promise<void>}
 */
const updateAlbumStocks = async (cartItems) => {
  await Promise.all(
    cartItems.map((item) => item.album.updateStock(item.quantity))
  );
};

/**
 * restoreAlbumStocks
 *
 * Restore stock when order is deleted
 *
 * @param {Array} orderItems - Order items with populated albums
 * @return {Promise<void>}
 */
const restoreAlbumStocks = async (orderItems) => {
  for (const item of orderItems) {
    if (item.album) {
      item.album.stock += item.quantity;

      // Re-enable availability if stock is restored
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
 * Verify user owns order or is admin
 *
 * @param {Object} order - Order document
 * @param {Object} user - User document
 * @throws {ForbiddenError} If unauthorized
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
 * Retrieve all orders for authenticated user
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
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
 * Retrieve all orders in system with pagination (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit } = parseQueryParams(req.query, { limit: 20 });
  const skip = (page - 1) * limit;

  // Execute both queries in parallel
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
 * Retrieve single order by ID with authorization check
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
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
 * Create new order from cart items
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, billingInfo, totalAmount } = req.body;

  // Validate required fields
  validateRequiredFields({ paymentMethod, billingInfo, totalAmount }, [
    "paymentMethod",
    "billingInfo",
    "totalAmount",
  ]);

  validateBillingInfo(billingInfo);

  // Get cart items with album data
  const cartItems = await CartItem.find({ user: req.user._id }).populate(
    "album"
  );
  const { orderItems, calculatedTotal } = await validateCartItems(cartItems);

  // Create order
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalAmount: calculatedTotal,
    paymentMethod,
    paymentInfo: {},
    billingInfo,
  });

  // Update stock and clear cart in parallel
  await Promise.all([
    updateAlbumStocks(cartItems),
    CartItem.deleteMany({ user: req.user._id }),
  ]);

  await order.populate("items.album");

  res
    .status(201)
    .json(formatResponse(true, "Order created successfully", order));
});

/**
 * updateOrder
 *
 * Update order details (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  assertFound(order, "Order");

  // Remove protected fields that shouldn't be updated
  const updates = sanitizeObject(req.body, [
    "user",
    "orderNumber",
    "createdAt",
  ]);

  // Recalculate total if items are modified
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
 * Permanently delete order and restore stock (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("items.album");
  assertFound(order, "Order");

  // Restore album stocks before deletion
  await restoreAlbumStocks(order.items);
  await order.deleteOne();

  res.json(formatResponse(true, "Order deleted successfully"));
});

/**
 * getOrderStatistics
 *
 * Retrieve order statistics (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
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
