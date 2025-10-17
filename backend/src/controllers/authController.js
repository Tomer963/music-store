import User from "../models/User.js";
import CartItem from "../models/CartItem.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * register
 * Creates a new user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const register = async (req, res, next) => {
  try {
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
      return res
        .status(400)
        .json(formatResponse(false, MESSAGES.ERROR.EMAIL_EXISTS));
    }

    // Create new user
    const user = await User.create({ firstName, lastName, email, password });

    // Get sessionId from header or body
    const sessionId = req.headers["x-session-id"] || bodySessionId;

    // Transfer guest cart to new user if session exists
    if (sessionId) {
      await transferCart(sessionId, user._id, false);
    }

    res.status(201).json(
      formatResponse(true, MESSAGES.SUCCESS.REGISTER, {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * login
 * Authenticates user and returns token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, sessionId: bodySessionId } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json(formatResponse(false, MESSAGES.ERROR.INVALID_CREDENTIALS));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate authentication token
    const token = user.generateAuthToken();

    // Get sessionId from header or body
    const sessionId = req.headers["x-session-id"] || bodySessionId;

    // Merge guest cart with user cart if session exists
    if (sessionId) {
      await transferCart(sessionId, user._id, true);
    }

    res.json(
      formatResponse(true, MESSAGES.SUCCESS.LOGIN, {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        token,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * getProfile
 * Retrieves authenticated user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.json(formatResponse(true, "Profile retrieved", user));
  } catch (error) {
    next(error);
  }
};

/**
 * logout
 * Logs out the user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {Promise<void>}
 */
export const logout = async (req, res, next) => {
  try {
    res.json(formatResponse(true, MESSAGES.SUCCESS.LOGOUT));
  } catch (error) {
    next(error);
  }
};

/**
 * transferCart
 * Transfers or merges guest cart to user cart
 * @param {string} sessionId - Guest session ID
 * @param {string} userId - User ID
 * @param {boolean} merge - Whether to merge with existing cart
 * @return {Promise<void>}
 */
async function transferCart(sessionId, userId, merge) {
  try {
    // Find guest cart items
    const guestItems = await CartItem.find({ sessionId }).populate("album");

    if (guestItems.length === 0) {
      return;
    }

    if (merge) {
      // Merge mode: combine guest cart with existing user cart
      const userItems = await CartItem.find({ user: userId }).populate("album");

      // Create a map of user's existing items by album ID
      const userItemsMap = new Map();
      userItems.forEach((item) => {
        userItemsMap.set(item.album._id.toString(), item);
      });

      // Process each guest item
      for (const guestItem of guestItems) {
        const albumId = guestItem.album._id.toString();
        const existingUserItem = userItemsMap.get(albumId);

        if (existingUserItem) {
          // Album exists in user cart - merge quantities
          const newQuantity = existingUserItem.quantity + guestItem.quantity;
          const maxStock = guestItem.album.stock || 99;

          existingUserItem.quantity = Math.min(newQuantity, maxStock);
          await existingUserItem.save();

          // Remove guest item
          await guestItem.deleteOne();
        } else {
          // Album doesn't exist in user cart - transfer ownership
          guestItem.user = userId;
          guestItem.sessionId = undefined;
          await guestItem.save();
        }
      }
    } else {
      // Simple transfer for new registration - just change ownership
      for (const guestItem of guestItems) {
        guestItem.user = userId;
        guestItem.sessionId = undefined;
        await guestItem.save();
      }
    }
  } catch (error) {
    console.error("Cart transfer error:", error);
    throw error;
  }
}
