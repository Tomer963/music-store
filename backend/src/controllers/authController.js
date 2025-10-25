import User from "../models/User.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse, sanitizeUser } from "../utils/helpers.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

/**
 * register
 *
 * Creates a new user account and optionally transfers guest cart
 */
export const register = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    sessionId: bodySessionId,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(MESSAGES.ERROR.EMAIL_EXISTS, 400);
  }

  const user = await User.create({ firstName, lastName, email, password });

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
 * Authenticates user and returns JWT token, optionally merges guest cart
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, sessionId: bodySessionId } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(MESSAGES.ERROR.INVALID_CREDENTIALS, 401);
  }

  user.lastLogin = new Date();
  await user.save();

  const token = user.generateAuthToken();

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
 * Retrieves authenticated user's profile with populated wishlist
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  res.json(formatResponse(true, "Profile retrieved", user));
});

/**
 * logout
 *
 * Logs out the user (client-side token removal)
 */
export const logout = asyncHandler(async (req, res) => {
  res.json(formatResponse(true, MESSAGES.SUCCESS.LOGOUT));
});

/**
 * transferCart
 *
 * Transfers or merges guest cart items to user cart
 *
 * @param {string} sessionId - Guest session ID
 * @param {string} userId - User ID
 * @param {boolean} merge - Whether to merge with existing cart or transfer completely
 * @return {Promise<void>}
 */
async function transferCart(sessionId, userId, merge) {
  const guestItems = await CartItem.find({ sessionId }).populate("album");

  if (guestItems.length === 0) return;

  if (merge) {
    const userItems = await CartItem.find({ user: userId }).populate("album");
    const userItemsMap = new Map(
      userItems.map((item) => [item.album._id.toString(), item])
    );

    for (const guestItem of guestItems) {
      const albumId = guestItem.album._id.toString();
      const existingUserItem = userItemsMap.get(albumId);

      if (existingUserItem) {
        const newQuantity = existingUserItem.quantity + guestItem.quantity;
        const maxStock = guestItem.album.stock || 99;
        existingUserItem.quantity = Math.min(newQuantity, maxStock);
        await existingUserItem.save();
        await guestItem.deleteOne();
      } else {
        guestItem.user = userId;
        guestItem.sessionId = undefined;
        await guestItem.save();
      }
    }
  } else {
    await CartItem.updateMany(
      { sessionId },
      { $set: { user: userId }, $unset: { sessionId: 1 } }
    );
  }
}