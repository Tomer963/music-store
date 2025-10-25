import CartItem from "../models/CartItem.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, generateSessionId } from "../utils/helpers.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

/**
 * buildCartQuery
 *
 * Build query filter based on user authentication status
 *
 * @param {Object} req - Express request object
 * @return {Object} MongoDB query filter
 */
const buildCartQuery = (req) => {
  const sessionId = req.headers["x-session-id"];
  // Use user ID if authenticated, otherwise use session ID
  return req.user ? { user: req.user._id } : { sessionId };
};

/**
 * calculateCartTotal
 *
 * Calculate total price for all cart items
 *
 * @param {Array} cartItems - Array of cart items with populated albums
 * @return {number} Total cart price
 */
const calculateCartTotal = (cartItems) => {
  return cartItems.reduce(
    (sum, item) => sum + item.album.price * item.quantity,
    0
  );
};

/**
 * getCart
 *
 * Retrieve user's cart items with calculated total
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getCart = asyncHandler(async (req, res) => {
  const query = buildCartQuery(req);
  const cartItems = await CartItem.find(query).populate("album");
  const total = calculateCartTotal(cartItems);

  res.json(
    formatResponse(true, "Cart retrieved", {
      items: cartItems,
      itemCount: cartItems.length,
      total,
    })
  );
});

/**
 * addToCart
 *
 * Add album to cart or update quantity if already exists
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const addToCart = asyncHandler(async (req, res) => {
  const { albumId, quantity = 1 } = req.body;

  // Verify album exists
  const album = await Album.findById(albumId);
  if (!album) {
    throw new AppError("Album not found", 404);
  }

  // Check stock availability
  if (!album.canPurchase(quantity)) {
    throw new AppError(MESSAGES.ERROR.OUT_OF_STOCK, 400);
  }

  // Get or generate session ID for guest users
  let sessionId = req.headers["x-session-id"];
  if (!req.user && !sessionId) {
    sessionId = generateSessionId();
  }

  // Prepare cart item data based on authentication
  const cartData = {
    album: albumId,
    quantity,
    ...(req.user ? { user: req.user._id } : { sessionId }),
  };

  const searchCriteria = {
    album: albumId,
    ...(req.user ? { user: req.user._id } : { sessionId }),
  };

  // Find existing cart item or create new one
  let cartItem = await CartItem.findOne(searchCriteria);

  if (cartItem) {
    // Item already in cart - increase quantity
    cartItem.quantity += quantity;
    await cartItem.save();
  } else {
    // New item - create cart entry
    cartItem = await CartItem.create(cartData);
  }

  await cartItem.populate("album");

  res.json(
    formatResponse(true, "Item added to cart", {
      item: cartItem,
      sessionId: !req.user ? sessionId : undefined, // Return session ID for guests
    })
  );
});

/**
 * updateCartItem
 *
 * Update quantity of specific cart item
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cartItem = await CartItem.findById(req.params.id).populate("album");

  if (!cartItem) {
    throw new AppError("Cart item not found", 404);
  }

  // Verify ownership - check user ID for authenticated or session ID for guests
  const isAuthorized = req.user
    ? cartItem.user && cartItem.user.equals(req.user._id)
    : cartItem.sessionId === req.headers["x-session-id"];

  if (!isAuthorized) {
    throw new AppError(MESSAGES.ERROR.UNAUTHORIZED, 403);
  }

  // Verify stock availability for new quantity
  if (!cartItem.album.canPurchase(quantity)) {
    throw new AppError(MESSAGES.ERROR.OUT_OF_STOCK, 400);
  }

  await cartItem.updateQuantity(quantity);

  res.json(formatResponse(true, "Cart item updated", cartItem));
});

/**
 * removeFromCart
 *
 * Remove specific item from cart
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const removeFromCart = asyncHandler(async (req, res) => {
  const cartItem = await CartItem.findById(req.params.id);

  if (!cartItem) {
    throw new AppError("Cart item not found", 404);
  }

  // Verify ownership
  const isAuthorized = req.user
    ? cartItem.user && cartItem.user.equals(req.user._id)
    : cartItem.sessionId === req.headers["x-session-id"];

  if (!isAuthorized) {
    throw new AppError(MESSAGES.ERROR.UNAUTHORIZED, 403);
  }

  await cartItem.deleteOne();

  res.json(formatResponse(true, "Item removed from cart"));
});

/**
 * clearCart
 *
 * Remove all items from user's cart
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const clearCart = asyncHandler(async (req, res) => {
  const query = buildCartQuery(req);
  await CartItem.deleteMany(query);

  res.json(formatResponse(true, "Cart cleared"));
});
