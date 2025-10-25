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
