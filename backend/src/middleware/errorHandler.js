import { MESSAGES } from "../config/constants.js";

/**
 * AppError
 *
 * Custom application error class for operational errors
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
 * NotFoundError
 *
 * Error for resource not found (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

/**
 * UnauthorizedError
 *
 * Error for authentication required (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = MESSAGES.ERROR.UNAUTHORIZED) {
    super(message, 401);
  }
}

/**
 * ForbiddenError
 *
 * Error for insufficient permissions (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
  }
}

/**
 * ValidationError
 *
 * Error for input validation failure (400)
 */
export class ValidationError extends AppError {
  constructor(errors) {
    super(MESSAGES.ERROR.VALIDATION_ERROR, 400, errors);
  }
}

/**
 * ConflictError
 *
 * Error for resource conflict like duplicates (409)
 */
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

/**
 * BadRequestError
 *
 * Error for invalid request (400)
 */
export class BadRequestError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

/**
 * buildErrorResponse
 *
 * Create standardized error response object
 *
 * @param {Error} err - Error object
 * @param {boolean} includeStack - Whether to include stack trace
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

  // Include stack trace only in development
  if (includeStack && process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  return response;
};

/**
 * handleValidationError
 *
 * Handle Mongoose validation errors
 *
 * @param {Error} err - Mongoose validation error
 * @return {AppError} Formatted application error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new ValidationError(errors);
};

/**
 * handleDuplicateKeyError
 *
 * Handle MongoDB duplicate key errors
 *
 * @param {Error} err - MongoDB duplicate key error
 * @return {AppError} Formatted application error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new ConflictError(`${field} '${value}' already exists`);
};

/**
 * handleCastError
 *
 * Handle Mongoose cast errors (invalid ObjectId, etc.)
 *
 * @param {Error} err - Mongoose cast error
 * @return {AppError} Formatted application error
 */
const handleCastError = (err) => {
  return new BadRequestError(`Invalid ${err.path}: ${err.value}`);
};

/**
 * handleJWTError
 *
 * Handle JWT authentication errors
 *
 * @param {Error} err - JWT error
 * @return {AppError} Formatted application error
 */
const handleJWTError = (err) => {
  if (err.name === "TokenExpiredError") {
    return new UnauthorizedError("Token expired");
  }
  return new UnauthorizedError("Invalid token");
};

/**
 * logError
 *
 * Log error details for debugging
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 */
const logError = (err, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: err.message,
    statusCode: err.statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?._id,
  };

  // Include additional details in development
  if (process.env.NODE_ENV === "development") {
    errorLog.stack = err.stack;
    errorLog.body = req.body;
  }

  console.error("Error:", errorLog);
};

/**
 * errorHandler
 *
 * Global error handling middleware
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  logError(err, req);

  let error = err;

  // Convert known errors to AppError
  if (err.name === "ValidationError") {
    error = handleValidationError(err);
  } else if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  } else if (err.name === "CastError") {
    error = handleCastError(err);
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    error = handleJWTError(err);
  } else if (!err.isOperational) {
    // Unknown error - convert to generic AppError
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
 * @return {Function} Wrapped function that catches errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * notFoundHandler
 *
 * Handler for undefined routes (404)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

/**
 * assertFound
 *
 * Throw NotFoundError if resource is null or undefined
 *
 * @param {*} resource - Resource to check
 * @param {string} resourceName - Name for error message
 * @throws {NotFoundError}
 */
export const assertFound = (resource, resourceName = "Resource") => {
  if (!resource) {
    throw new NotFoundError(resourceName);
  }
};

/**
 * assertAuthorized
 *
 * Throw ForbiddenError if condition is false
 *
 * @param {boolean} condition - Authorization condition
 * @param {string} message - Error message
 * @throws {ForbiddenError}
 */
export const assertAuthorized = (condition, message = "Access denied") => {
  if (!condition) {
    throw new ForbiddenError(message);
  }
};
