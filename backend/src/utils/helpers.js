/**
 * paginate
 * Paginates query results
 * @param {Object} query - Mongoose query object
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @return {Promise<Object>}
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
 * formatResponse
 * Creates standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {*} data - Response data
 * @param {Array} errors - Validation errors
 * @return {Object}
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
 * Generates unique session ID for anonymous users
 * @return {string}
 */
export const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * sanitizeCardNumber
 * Returns only last 4 digits of credit card
 * @param {string} cardNumber - Full credit card number
 * @return {string}
 */
export const sanitizeCardNumber = (cardNumber) => {
  return cardNumber.slice(-4);
};
