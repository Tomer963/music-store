/**
 * Order controller
 * Handles order processing
 */

import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, sanitizeCardNumber } from "../utils/helpers.js";

/**
 * Get user orders
 * @route GET /api/v1/orders
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
 * Get order by ID
 * @route GET /api/v1/orders/:id
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.album")
      .populate("user", "firstName lastName email");

    if (!order) {
      return res.status(404).json(formatResponse(false, "Order not found"));
    }

    // Check ownership
    if (!order.user.equals(req.user._id)) {
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
 * Create new order
 * @route POST /api/v1/orders
 */
export const createOrder = async (req, res, next) => {
  try {
    const { paymentMethod, paymentInfo, billingInfo } = req.body;

    // Get user cart
    const cartItems = await CartItem.find({ user: req.user._id }).populate(
      "album"
    );

    if (cartItems.length === 0) {
      return res.status(400).json(formatResponse(false, "Cart is empty"));
    }

    // Prepare order items and check stock
    const orderItems = [];
    for (const cartItem of cartItems) {
      if (!cartItem.album.canPurchase(cartItem.quantity)) {
        return res
          .status(400)
          .json(
            formatResponse(false, `${cartItem.album.title} is out of stock`)
          );
      }

      orderItems.push({
        album: cartItem.album._id,
        quantity: cartItem.quantity,
        price: cartItem.album.price,
      });
    }

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      paymentMethod,
      paymentInfo:
        paymentMethod === "credit_card"
          ? {
              cardType: paymentInfo.cardType,
              lastFourDigits: sanitizeCardNumber(paymentInfo.cardNumber),
            }
          : { checkNumber: paymentInfo.checkNumber },
      billingInfo,
    });

    // Calculate total
    order.calculateTotal();
    await order.save();

    // Update album stock
    for (const cartItem of cartItems) {
      await cartItem.album.updateStock(cartItem.quantity);
    }

    // Clear cart
    await CartItem.deleteMany({ user: req.user._id });

    // Populate order details
    await order.populate("items.album");

    res
      .status(201)
      .json(formatResponse(true, "Order created successfully", order));
  } catch (error) {
    next(error);
  }
};
