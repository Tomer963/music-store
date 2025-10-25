import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * getOrders
 *
 * Retrieves all orders for the authenticated user
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.album")
      .sort("-createdAt");

    res.json(formatResponse(true, "Orders retrieved", orders));
  } catch (error) {
    next(error);
  }
};

/**
 * getAllOrders
 *
 * Retrieves all orders in the system with pagination (Admin only)
 *
 * @param {Object} req - Express request object with optional pagination params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate("items.album")
      .populate("user", "firstName lastName email")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments();

    res.json(
      formatResponse(true, "All orders retrieved", {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

/**
 * getOrder
 *
 * Retrieves a single order by ID with authorization check
 *
 * @param {Object} req - Express request object with order ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.album")
      .populate("user", "firstName lastName email");

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Check if user owns the order or is admin
    if (!order.user.equals(req.user._id) && req.user.role !== "admin") {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    res.json(formatResponse(true, "Order retrieved", order));
  } catch (error) {
    next(error);
  }
};

/**
 * createOrder
 *
 * Creates a new order from cart items with validation and stock updates
 *
 * @param {Object} req - Express request object with order details in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const createOrder = async (req, res, next) => {
  try {
    const { paymentMethod, billingInfo, totalAmount } = req.body;

    // Validate required fields
    if (!totalAmount) {
      return res
        .status(400)
        .json(formatResponse(false, "Total amount is required"));
    }

    if (!paymentMethod) {
      return res
        .status(400)
        .json(formatResponse(false, "Payment method is required"));
    }

    if (!billingInfo) {
      return res
        .status(400)
        .json(formatResponse(false, "Billing information is required"));
    }

    // Check required billing fields
    if (
      !billingInfo.address ||
      !billingInfo.city ||
      !billingInfo.zipCode ||
      !billingInfo.phone
    ) {
      return res
        .status(400)
        .json(
          formatResponse(false, "Complete billing information is required"),
        );
    }

    // Get user's cart items
    const cartItems = await CartItem.find({ user: req.user._id }).populate(
      "album",
    );

    if (cartItems.length === 0) {
      return res.status(400).json(formatResponse(false, "Cart is empty"));
    }

    // Validate stock and prepare order items
    const orderItems = [];
    let calculatedTotal = 0;

    for (const cartItem of cartItems) {
      // Check stock availability
      if (!cartItem.album.canPurchase(cartItem.quantity)) {
        return res
          .status(400)
          .json(
            formatResponse(false, `${cartItem.album.title} is out of stock`),
          );
      }

      orderItems.push({
        album: cartItem.album._id,
        quantity: cartItem.quantity,
        price: cartItem.album.price,
      });

      calculatedTotal += cartItem.album.price * cartItem.quantity;
    }

    const paymentData = {};

    // Create the order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentInfo: paymentData,
      billingInfo,
    });

    // Update stock for each album
    await Promise.all(
      cartItems.map((item) => item.album.updateStock(item.quantity)),
    );

    // Clear user's cart
    await CartItem.deleteMany({ user: req.user._id });

    await order.populate("items.album");

    res
      .status(201)
      .json(formatResponse(true, "Order created successfully", order));
  } catch (error) {
    console.error("Order creation error:", error.message);
    next(error);
  }
};

/**
 * updateOrder
 *
 * Updates order details with protection for critical fields (Admin only)
 *
 * @param {Object} req - Express request object with order ID in params and update data in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Prevent updating certain protected fields
    const restrictedFields = ["user", "orderNumber", "createdAt"];
    restrictedFields.forEach((field) => delete updates[field]);

    // If updating items, recalculate total
    if (updates.items) {
      let newTotal = 0;
      for (const item of updates.items) {
        newTotal += item.price * item.quantity;
      }
      updates.totalAmount = newTotal;
    }

    // Update the order
    Object.keys(updates).forEach((key) => {
      order[key] = updates[key];
    });

    await order.save();
    await order.populate("items.album");
    await order.populate("user", "firstName lastName email");

    res.json(formatResponse(true, "Order updated successfully", order));
  } catch (error) {
    next(error);
  }
};

/**
 * deleteOrder
 *
 * Permanently deletes an order and restores stock (Admin only)
 *
 * @param {Object} req - Express request object with order ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("items.album");

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Restore stock for each item before deleting
    for (const item of order.items) {
      if (item.album) {
        item.album.stock += item.quantity;
        if (!item.album.availability && item.album.stock > 0) {
          item.album.availability = true;
        }
        await item.album.save();
      }
    }

    await order.deleteOne();

    res.json(formatResponse(true, "Order deleted successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * getOrderStatistics
 *
 * Retrieves order statistics including total count and revenue (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getOrderStatistics = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.json(
      formatResponse(true, "Order statistics retrieved", {
        totalOrders,
        totalRevenue,
      }),
    );
  } catch (error) {
    next(error);
  }
};
