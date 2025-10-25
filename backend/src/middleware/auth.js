import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { MESSAGES } from "../config/constants.js";

/**
 * authenticate
 *
 * Middleware to authenticate user via JWT token
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
        error: "No authentication token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
        error: "Invalid or expired token",
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Token expired"
        : MESSAGES.ERROR.UNAUTHORIZED;

    return res.status(401).json({
      success: false,
      message,
      error: error.message,
    });
  }
};

/**
 * isAdmin
 *
 * Middleware to check if authenticated user has admin role
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {void}
 */
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
      error: "Insufficient permissions",
    });
  }
  next();
};

/**
 * optionalAuth
 *
 * Middleware for optional authentication (doesn't fail if no token provided)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (user) {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch {
    // Silently fail for optional auth
    next();
  }
};