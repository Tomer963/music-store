/**
 * Cart controller
 * Handles shopping cart operations
 */

import CartItem from "../models/CartItem.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, generateSessionId } from "../utils/helpers.js";

/**
 * Get user cart
 * @route GET /api/v1/cart
 */
export const getCart = async (req, res, next) => {
  try {
    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };

    const cartItems = await CartItem.find(query).populate("album");

    const total = cartItems.reduce((sum, item) => {
      return sum + item.album.price * item.quantity;
    }, 0);

    res.json(
      formatResponse(true, "Cart retrieved", {
        items: cartItems,
        itemCount: cartItems.length,
        total,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart
 * @route POST /api/v1/cart/items
 */
export const addToCart = async (req, res, next) => {
  try {
    const { albumId, quantity = 1 } = req.body;

    // Check album availability
    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json(formatResponse(false, "Album not found"));
    }

    if (!album.canPurchase(quantity)) {
      return res
        .status(400)
        .json(formatResponse(false, MESSAGES.ERROR.OUT_OF_STOCK));
    }

    // Prepare cart item data
    const cartData = {
      album: albumId,
      quantity,
    };

    if (req.user) {
      cartData.user = req.user._id;
    } else {
      cartData.sessionId = req.headers["x-session-id"] || generateSessionId();
    }

    // Find or create cart item
    let cartItem = await CartItem.findOne({
      album: albumId,
      ...(req.user
        ? { user: req.user._id }
        : { sessionId: cartData.sessionId }),
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create(cartData);
    }

    await cartItem.populate("album");

    res.json(
      formatResponse(true, "Item added to cart", {
        item: cartItem,
        sessionId: cartData.sessionId,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update cart item quantity
 * @route PUT /api/v1/cart/items/:id
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    const cartItem = await CartItem.findById(req.params.id).populate("album");

    if (!cartItem) {
      return res.status(404).json(formatResponse(false, "Cart item not found"));
    }

    // Check ownership
    if (req.user && !cartItem.user.equals(req.user._id)) {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    // Check stock
    if (!cartItem.album.canPurchase(quantity)) {
      return res
        .status(400)
        .json(formatResponse(false, MESSAGES.ERROR.OUT_OF_STOCK));
    }

    await cartItem.updateQuantity(quantity);

    res.json(formatResponse(true, "Cart item updated", cartItem));
  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 * @route DELETE /api/v1/cart/items/:id
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const cartItem = await CartItem.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json(formatResponse(false, "Cart item not found"));
    }

    // Check ownership
    if (req.user && !cartItem.user.equals(req.user._id)) {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    await cartItem.deleteOne();

    res.json(formatResponse(true, "Item removed from cart"));
  } catch (error) {
    next(error);
  }
};

/**
 * Clear cart
 * @route DELETE /api/v1/cart
 */
export const clearCart = async (req, res, next) => {
  try {
    const query = req.user
      ? { user: req.user._id }
      : { sessionId: req.headers["x-session-id"] };

    await CartItem.deleteMany(query);

    res.json(formatResponse(true, "Cart cleared"));
  } catch (error) {
    next(error);
  }
};
