/**
 * Helper functions
 * Utility functions used across the application
 */

/**
 * Paginate query results
 * @param {Object} query - Mongoose query object
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated results
 */
export const paginate = async (query, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    query.skip(skip).limit(limit),
    query.model.countDocuments(query.getQuery()),
  ]);

  return {
    results,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Format response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {any} data - Response data
 * @param {any} errors - Validation errors
 * @returns {Object} Formatted response
 */
export const formatResponse = (success, message, data = null, errors = null) => {
  const response = { success, message };
  if (data !== null) {
    response.data = data;
  }
  if (errors !== null) {
    response.errors = errors;
  }
  return response;
};

/**
 * Generate session ID for anonymous cart
 * @returns {string} Session ID
 */
export const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Sanitize credit card number
 * @param {string} cardNumber - Full credit card number
 * @returns {string} Last 4 digits only
 */
export const sanitizeCardNumber = (cardNumber) => {
  return cardNumber.slice(-4);
};

/**
 * Calculate order total
 * @param {Array} items - Order items
 * @returns {number} Total amount
 */
export const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
};