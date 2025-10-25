/**
 * Helper utilities for common operations
 */

/**
 * paginate
 *
 * Paginate query results with metadata
 *
 * @param {Object} query - Mongoose query object
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @return {Promise<Object>} Paginated results with metadata
 */
export const paginate = async (query, page = 1, limit = 12) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Execute query and count in parallel
  const [results, total] = await Promise.all([
    query.skip(skip).limit(limitNum),
    query.model.countDocuments(query.getQuery()),
  ]);

  return {
    results,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * formatResponse
 *
 * Create standardized API response object
 *
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {*} data - Response data
 * @param {Array} errors - Validation errors
 * @return {Object} Formatted response
 */
export const formatResponse = (
  success,
  message,
  data = null,
  errors = null
) => {
  const response = { success, message };

  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;

  return response;
};

/**
 * generateSessionId
 *
 * Generate unique session ID for anonymous users
 *
 * @return {string} Unique session identifier
 */
export const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * sanitizeUser
 *
 * Remove sensitive fields from user object
 *
 * @param {Object} user - User object
 * @return {Object} Sanitized user object
 */
export const sanitizeUser = (user) => {
  const { password, __v, ...sanitized } = user.toObject
    ? user.toObject()
    : user;
  return sanitized;
};

/**
 * validateObjectId
 *
 * Check if string is valid MongoDB ObjectId
 *
 * @param {string} id - ID to validate
 * @return {boolean} True if valid ObjectId format
 */
export const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * calculatePriceWithDiscount
 *
 * Calculate discounted price
 *
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage (0-100)
 * @return {number} Discounted price
 */
export const calculatePriceWithDiscount = (price, discount) => {
  return Math.round((price * (100 - discount)) / 100);
};

/**
 * isStockAvailable
 *
 * Check if sufficient stock is available
 *
 * @param {number} currentStock - Current stock quantity
 * @param {number} requestedQuantity - Requested quantity
 * @return {boolean} True if stock available
 */
export const isStockAvailable = (currentStock, requestedQuantity) => {
  return currentStock >= requestedQuantity && currentStock > 0;
};

/**
 * buildQueryFilter
 *
 * Build MongoDB query filter based on user authentication
 *
 * @param {Object} req - Express request object
 * @param {string} sessionIdHeader - Session ID header name
 * @return {Object} Query filter object
 */
export const buildQueryFilter = (req, sessionIdHeader = "x-session-id") => {
  const sessionId = req.headers[sessionIdHeader.toLowerCase()];
  return req.user ? { user: req.user._id } : { sessionId };
};

/**
 * calculateTotal
 *
 * Calculate total price from items array
 *
 * @param {Array} items - Array of items with price and quantity
 * @return {number} Total price
 */
export const calculateTotal = (items) => {
  return items.reduce((sum, item) => {
    const price = item.album?.price || item.price || 0;
    const quantity = item.quantity || 0;
    return sum + price * quantity;
  }, 0);
};

/**
 * checkOwnership
 *
 * Check if user owns a resource
 *
 * @param {Object} resource - Resource with user/sessionId
 * @param {Object} req - Express request object
 * @param {string} sessionIdHeader - Session ID header name
 * @return {boolean} True if user owns resource
 */
export const checkOwnership = (
  resource,
  req,
  sessionIdHeader = "x-session-id"
) => {
  if (req.user) {
    return resource.user && resource.user.equals(req.user._id);
  }
  return resource.sessionId === req.headers[sessionIdHeader.toLowerCase()];
};

/**
 * parseQueryParams
 *
 * Parse and validate common query parameters
 *
 * @param {Object} query - Express request query object
 * @param {Object} defaults - Default values
 * @return {Object} Parsed parameters
 */
export const parseQueryParams = (query, defaults = {}) => {
  const {
    page = defaults.page || 1,
    limit = defaults.limit || 12,
    sort = defaults.sort || "-createdAt",
    ...filters
  } = query;

  return {
    page: Math.max(1, parseInt(page)),
    limit: Math.max(1, Math.min(100, parseInt(limit))),
    sort,
    filters,
  };
};

/**
 * populateResource
 *
 * Generic function to populate resource with error handling
 *
 * @param {Promise} query - Mongoose query promise
 * @param {string} resourceName - Resource name for error message
 * @return {Promise<Object>} Populated resource
 * @throws {Error} If resource not found
 */
export const populateResource = async (query, resourceName = "Resource") => {
  const resource = await query;
  if (!resource) {
    const error = new Error(`${resourceName} not found`);
    error.statusCode = 404;
    throw error;
  }
  return resource;
};

/**
 * validateRequiredFields
 *
 * Validate that required fields are present
 *
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Required field names
 * @throws {Error} If required field is missing
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    const error = new Error(
      `Missing required fields: ${missingFields.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }
};

/**
 * sanitizeObject
 *
 * Remove specified fields from object
 *
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} fieldsToRemove - Fields to remove
 * @return {Object} Sanitized object
 */
export const sanitizeObject = (obj, fieldsToRemove = []) => {
  const sanitized = { ...obj };
  fieldsToRemove.forEach((field) => delete sanitized[field]);
  return sanitized;
};

/**
 * getClientIp
 *
 * Extract client IP from request (handles proxies)
 *
 * @param {Object} req - Express request object
 * @return {string} Client IP address
 */
export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const ip = req.ip || req.connection?.remoteAddress || "unknown";

  let clientIp = ip;

  // Check forwarded headers
  if (forwarded) {
    clientIp = forwarded.split(",")[0].trim();
  } else if (realIp) {
    clientIp = realIp;
  }

  // Remove IPv6 prefix if present
  return clientIp.replace(/^::ffff:/, "");
};

/**
 * formatValidationErrors
 *
 * Format express-validator errors into consistent structure
 *
 * @param {Array} errors - Array of express-validator errors
 * @return {Array} Formatted error array
 */
export const formatValidationErrors = (errors) => {
  return errors.map((err) => ({
    field: err.param || err.path,
    message: err.msg,
  }));
};

/**
 * isAdmin
 *
 * Check if user has admin role
 *
 * @param {Object} user - User object
 * @return {boolean} True if admin
 */
export const isAdmin = (user) => {
  return user && user.role === "admin";
};

/**
 * createSearchRegex
 *
 * Create case-insensitive regex for search
 *
 * @param {string} searchTerm - Search term
 * @return {RegExp} Search regex
 */
export const createSearchRegex = (searchTerm) => {
  // Escape special regex characters
  const sanitized = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(sanitized, "i");
};

/**
 * groupBy
 *
 * Group array items by key
 *
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function to group by
 * @return {Object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = typeof key === "function" ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};
