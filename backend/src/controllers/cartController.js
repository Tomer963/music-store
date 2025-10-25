import CartItem from "../models/CartItem.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, generateSessionId } from "../utils/helpers.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

/**
 * Build cart query based on authentication
 */
const buildCartQuery = (req) => {
  const sessionId = req.headers["x-session-id"];
  return req.user ? { user: req.user._id } : { sessionId };
};

/**
 * Calculate cart total
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
 * Retrieves the user's cart items with calculated total
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
 * Adds an album to the cart or updates quantity if already exists
 */
export const addToCart = asyncHandler(async (req, res) => {
  const { albumId, quantity = 1 } = req.body;

  const album = await Album.findById(albumId);
  if (!album) {
    throw new AppError("Album not found", 404);
  }

  if (!album.canPurchase(quantity)) {
    throw new AppError(MESSAGES.ERROR.OUT_OF_STOCK, 400);
  }

  let sessionId = req.headers["x-session-id"];
  if (!req.user && !sessionId) {
    sessionId = generateSessionId();
  }

  const cartData = {
    album: albumId,
    quantity,
    ...(req.user ? { user: req.user._id } : { sessionId }),
  };

  const searchCriteria = {
    album: albumId,
    ...(req.user ? { user: req.user._id } : { sessionId }),
  };

  let cartItem = await CartItem.findOne(searchCriteria);

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
      sessionId: !req.user ? sessionId : undefined,
    })
  );
});

/**
 * updateCartItem
 *
 * Updates the quantity of a cart item
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cartItem = await CartItem.findById(req.params.id).populate("album");

  if (!cartItem) {
    throw new AppError("Cart item not found", 404);
  }

  // Check authorization
  const isAuthorized = req.user
    ? cartItem.user && cartItem.user.equals(req.user._id)
    : cartItem.sessionId === req.headers["x-session-id"];

  if (!isAuthorized) {
    throw new AppError(MESSAGES.ERROR.UNAUTHORIZED, 403);
  }

  if (!cartItem.album.canPurchase(quantity)) {
    throw new AppError(MESSAGES.ERROR.OUT_OF_STOCK, 400);
  }

  await cartItem.updateQuantity(quantity);

  res.json(formatResponse(true, "Cart item updated", cartItem));
});

/**
 * removeFromCart
 *
 * Removes an item from the cart
 */
export const removeFromCart = asyncHandler(async (req, res) => {
  const cartItem = await CartItem.findById(req.params.id);

  if (!cartItem) {
    throw new AppError("Cart item not found", 404);
  }

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
 * Removes all items from the cart
 */
export const clearCart = asyncHandler(async (req, res) => {
  const query = buildCartQuery(req);
  await CartItem.deleteMany(query);

  res.json(formatResponse(true, "Cart cleared"));
});