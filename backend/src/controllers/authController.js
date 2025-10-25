import User from "../models/User.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, sanitizeUser } from "../utils/helpers.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

/**
 * register
 *
 * Create new user account and transfer guest cart if exists
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const register = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    sessionId: bodySessionId,
  } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(MESSAGES.ERROR.EMAIL_EXISTS, 400);
  }

  // Create new user
  const user = await User.create({ firstName, lastName, email, password });

  // Transfer guest cart to new user if session ID provided
  const sessionId = req.headers["x-session-id"] || bodySessionId;
  if (sessionId) {
    await transferCart(sessionId, user._id, false);
  }

  res.status(201).json(
    formatResponse(true, MESSAGES.SUCCESS.REGISTER, {
      user: sanitizeUser(user),
    })
  );
});

/**
 * login
 *
 * Authenticate user and return JWT token with optional cart merge
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, sessionId: bodySessionId } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select("+password");

  // Validate credentials
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(MESSAGES.ERROR.INVALID_CREDENTIALS, 401);
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save();

  // Generate authentication token
  const token = user.generateAuthToken();

  // Merge guest cart with user cart if session ID provided
  const sessionId = req.headers["x-session-id"] || bodySessionId;
  if (sessionId) {
    await transferCart(sessionId, user._id, true);
  }

  res.json(
    formatResponse(true, MESSAGES.SUCCESS.LOGIN, {
      user: sanitizeUser(user),
      token,
    })
  );
});

/**
 * getProfile
 *
 * Retrieve authenticated user profile with populated wishlist
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  res.json(formatResponse(true, "Profile retrieved", user));
});

/**
 * logout
 *
 * Logout user (client handles token removal)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const logout = asyncHandler(async (req, res) => {
  res.json(formatResponse(true, MESSAGES.SUCCESS.LOGOUT));
});

/**
 * transferCart
 *
 * Transfer or merge guest cart items to authenticated user cart
 *
 * @param {string} sessionId - Guest session identifier
 * @param {ObjectId} userId - User ID to transfer cart to
 * @param {boolean} merge - If true, merge quantities; if false, replace
 * @return {Promise<void>}
 */
async function transferCart(sessionId, userId, merge) {
  const guestItems = await CartItem.find({ sessionId }).populate("album");

  if (guestItems.length === 0) return;

  if (merge) {
    // Merge mode: combine guest and user cart items
    const userItems = await CartItem.find({ user: userId }).populate("album");
    const userItemsMap = new Map(
      userItems.map((item) => [item.album._id.toString(), item])
    );

    for (const guestItem of guestItems) {
      const albumId = guestItem.album._id.toString();
      const existingUserItem = userItemsMap.get(albumId);

      if (existingUserItem) {
        // Album already in user cart - increase quantity up to stock limit
        const newQuantity = existingUserItem.quantity + guestItem.quantity;
        const maxStock = guestItem.album.stock || 99;
        existingUserItem.quantity = Math.min(newQuantity, maxStock);
        await existingUserItem.save();
        await guestItem.deleteOne();
      } else {
        // Album not in user cart - transfer ownership
        guestItem.user = userId;
        guestItem.sessionId = undefined;
        await guestItem.save();
      }
    }
  } else {
    // Replace mode: transfer all guest items to user
    await CartItem.updateMany(
      { sessionId },
      { $set: { user: userId }, $unset: { sessionId: 1 } }
    );
  }
}
