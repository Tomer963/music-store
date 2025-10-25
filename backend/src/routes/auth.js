import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { MESSAGES } from "../config/constants.js";
import { 
  UnauthorizedError, 
  ForbiddenError,
  asyncHandler 
} from "./errorHandler.js";

/**
 * extractToken
 *
 * Extracts JWT token from Authorization header
 *
 * @param {Object} req - Express request object
 * @return {string|null} JWT token or null
 */
const extractToken = (req) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return null;
  
  return authHeader.replace("Bearer ", "");
};

/**
 * verifyAndDecodeToken
 *
 * Verifies and decodes JWT token
 *
 * @param {string} token - JWT token
 * @return {Object} Decoded token payload
 * @throws {UnauthorizedError} If token is invalid or expired
 */
const verifyAndDecodeToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Token expired. Please login again.");
    }
    throw new UnauthorizedError("Invalid token. Please login again.");
  }
};

/**
 * authenticate
 *
 * Middleware to authenticate user via JWT token
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new UnauthorizedError("Authentication required. No token provided.");
  }

  const decoded = verifyAndDecodeToken(token);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    throw new UnauthorizedError("User not found. Token may be invalid.");
  }

  req.user = user;
  req.token = token;
  next();
});

/**
 * isAdmin
 *
 * Middleware to check if authenticated user has admin role
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError("Authentication required");
  }

  if (req.user.role !== "admin") {
    throw new ForbiddenError(
      "Access denied. Administrator privileges required."
    );
  }

  next();
};

/**
 * optionalAuth
 *
 * Middleware for optional authentication (doesn't fail if no token provided)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyAndDecodeToken(token);
      const user = await User.findById(decoded.id).select("-password");

      if (user) {
        req.user = user;
        req.token = token;
      }
    }
  } catch (error) {
    // Silently fail for optional auth - token might be expired or invalid
    // but we don't want to block the request
  }

  next();
};

/**
 * checkOwnership
 *
 * Middleware factory to check resource ownership
 * Can be used with or without admin bypass
 *
 * @param {Function} getResourceFn - Function to get resource from req
 * @param {boolean} allowAdmin - Allow admin to bypass ownership check
 * @return {Function} Express middleware
 */
export const checkOwnership = (getResourceFn, allowAdmin = true) => {
  return asyncHandler(async (req, res, next) => {
    const resource = await getResourceFn(req);

    if (!resource) {
      throw new NotFoundError("Resource");
    }

    const isOwner = resource.user && resource.user.equals(req.user._id);
    const isAdmin = allowAdmin && req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError(
        "Access denied. You don't have permission to access this resource."
      );
    }

    req.resource = resource;
    next();
  });
};