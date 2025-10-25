import { MESSAGES } from "../config/constants.js";

/**
 * Custom Application Error Class
 *
 * Extended error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Response Builder
 *
 * Creates standardized error response object
 *
 * @param {Error} err - Error object
 * @param {boolean} includeStack - Include stack trace in response
 * @return {Object} Formatted error response
 */
const buildErrorResponse = (err, includeStack = false) => {
  const response = {
    success: false,
    message: err.message || MESSAGES.ERROR.SERVER_ERROR,
    error: err.message || "Internal server error",
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (includeStack && process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  return response;
};

/**
 * Handle Mongoose Validation Error
 *
 * @param {Error} err - Mongoose validation error
 * @return {AppError} Formatted application error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new AppError(MESSAGES.ERROR.VALIDATION_ERROR, 400, errors);
};

/**
 * Handle Mongoose Duplicate Key Error
 *
 * @param {Error} err - Mongoose duplicate key error
 * @return {AppError} Formatted application error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 400);
};

/**
 * Handle Mongoose Cast Error
 *
 * @param {Error} err - Mongoose cast error
 * @return {AppError} Formatted application error
 */
const handleCastError = (err) => {
  return new AppError("Invalid ID format", 400);
};

/**
 * Handle JWT Errors
 *
 * @param {Error} err - JWT error
 * @return {AppError} Formatted application error
 */
const handleJWTError = (err) => {
  const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
  return new AppError(message, 401);
};

/**
 * errorHandler
 *
 * Global error handling middleware for Express application
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {void}
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  let error = err;

  // Convert known errors to AppError
  if (err.name === "ValidationError") {
    error = handleValidationError(err);
  } else if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  } else if (err.name === "CastError") {
    error = handleCastError(err);
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    error = handleJWTError(err);
  } else if (!err.isOperational) {
    // Unknown error - convert to AppError
    error = new AppError(
      process.env.NODE_ENV === "production" 
        ? MESSAGES.ERROR.SERVER_ERROR 
        : err.message,
      err.statusCode || 500
    );
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const response = buildErrorResponse(
    error,
    process.env.NODE_ENV === "development"
  );

  res.status(statusCode).json(response);
};

/**
 * asyncHandler
 *
 * Wrapper for async route handlers to catch errors
 *
 * @param {Function} fn - Async function to wrap
 * @return {Function} Wrapped function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * notFoundHandler
 *
 * Handler for undefined routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {void}
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
};