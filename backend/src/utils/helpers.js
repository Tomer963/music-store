/**
 * Helper utilities for common operations
 */

/**
 * paginate
 *
 * Paginates query results with metadata
 *
 * @param {Object} query - Mongoose query object
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 12)
 * @return {Promise<Object>} Paginated results with metadata
 */
export const paginate = async (query, page = 1, limit = 12) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

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
 * Creates standardized API response object
 *
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {*} data - Response data (optional)
 * @param {Array} errors - Validation errors (optional)
 * @return {Object} Formatted response object
 */
export const formatResponse = (
  success,
  message,
  data = null,
  errors = null,
) => {
  const response = { success, message };

  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;

  return response;
};

/**
 * generateSessionId
 *
 * Generates unique session ID for anonymous users
 *
 * @return {string} Unique session identifier
 */
export const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * sanitizeUser
 *
 * Removes sensitive fields from user object
 *
 * @param {Object} user - User object
 * @return {Object} Sanitized user object
 */
export const sanitizeUser = (user) => {
  const { password, __v, ...sanitized } = user.toObject ? user.toObject() : user;
  return sanitized;
};

/**
 * validateObjectId
 *
 * Checks if string is valid MongoDB ObjectId
 *
 * @param {string} id - ID to validate
 * @return {boolean} True if valid
 */
export const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * calculatePriceWithDiscount
 *
 * Calculates discounted price
 *
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage
 * @return {number} Discounted price
 */
export const calculatePriceWithDiscount = (price, discount) => {
  return Math.round((price * (100 - discount)) / 100);
};

/**
 * isStockAvailable
 *
 * Checks if sufficient stock is available
 *
 * @param {number} currentStock - Current stock
 * @param {number} requestedQuantity - Requested quantity
 * @return {boolean} True if available
 */
export const isStockAvailable = (currentStock, requestedQuantity) => {
  return currentStock >= requestedQuantity && currentStock > 0;
};