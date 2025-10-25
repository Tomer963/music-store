import CartItem from "../models/CartItem.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, generateSessionId } from "../utils/helpers.js";

/**
 * getCart
 *
 * Retrieves the user's cart items with calculated total
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const getCart = async (req, res, next) => {
  try {
    const sessionId = req.headers["x-session-id"];

    // Build query based on authentication status
    const query = req.user ? { user: req.user._id } : { sessionId };

    const cartItems = await CartItem.find(query).populate("album");

    // Calculate total price
    const total = cartItems.reduce(
      (sum, item) => sum + item.album.price * item.quantity,
      0,
    );

    res.json(
      formatResponse(true, "Cart retrieved", {
        items: cartItems,
        itemCount: cartItems.length,
        total,
      }),
    );
  } catch (error) {
    next(error);
  }
};

/**
 * addToCart
 *
 * Adds an album to the cart or updates quantity if already exists
 *
 * @param {Object} req - Express request object with albumId and quantity in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const addToCart = async (req, res, next) => {
  try {
    const { albumId, quantity = 1 } = req.body;

    // Verify album exists
    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json(formatResponse(false, "Album not found"));
    }

    // Check stock availability
    if (!album.canPurchase(quantity)) {
      return res
        .status(400)
        .json(formatResponse(false, MESSAGES.ERROR.OUT_OF_STOCK));
    }

    let sessionId = req.headers["x-session-id"];

    // Generate session ID for guest users
    if (!req.user && !sessionId) {
      sessionId = generateSessionId();
    }

    // Build cart item data
    const cartData = {
      album: albumId,
      quantity,
      ...(req.user ? { user: req.user._id } : { sessionId }),
    };

    // Build search criteria
    const searchCriteria = {
      album: albumId,
      ...(req.user ? { user: req.user._id } : { sessionId }),
    };

    let cartItem = await CartItem.findOne(searchCriteria);

    if (cartItem) {
      // Update existing item quantity
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create(cartData);
    }

    await cartItem.populate("album");

    res.json(
      formatResponse(true, "Item added to cart", {
        item: cartItem,
        sessionId: !req.user ? sessionId : undefined,
      }),
    );
  } catch (error) {
    next(error);
  }
};

/**
 * updateCartItem
 *
 * Updates the quantity of a cart item
 *
 * @param {Object} req - Express request object with cart item ID in params and quantity in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    const cartItem = await CartItem.findById(req.params.id).populate("album");

    if (!cartItem) {
      return res.status(404).json(formatResponse(false, "Cart item not found"));
    }

    // Check authorization for authenticated users
    if (req.user && cartItem.user && !cartItem.user.equals(req.user._id)) {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    // Check authorization for guest users
    if (!req.user && cartItem.sessionId !== req.headers["x-session-id"]) {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    // Check stock availability
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
 * removeFromCart
 *
 * Removes an item from the cart
 *
 * @param {Object} req - Express request object with cart item ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const cartItem = await CartItem.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json(formatResponse(false, "Cart item not found"));
    }

    // Check authorization for authenticated users
    if (req.user && cartItem.user && !cartItem.user.equals(req.user._id)) {
      return res
        .status(403)
        .json(formatResponse(false, MESSAGES.ERROR.UNAUTHORIZED));
    }

    // Check authorization for guest users
    if (!req.user && cartItem.sessionId !== req.headers["x-session-id"]) {
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
 * clearCart
 *
 * Removes all items from the cart
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
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
