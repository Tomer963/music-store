/**
 * Application-wide constants and enums
 */

/**
 * User role types
 */
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
};

/**
 * Supported payment methods
 */
export const PAYMENT_METHODS = {
  CREDIT_CARD: "credit_card",
  CHECK: "check",
};

/**
 * Pagination default values
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 100,
};

/**
 * Validation constraints
 */
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 12,
  MIN_SEARCH_LENGTH: 3,
};

/**
 * Standard response messages
 */
export const MESSAGES = {
  SUCCESS: {
    CREATED: "Resource created successfully",
    UPDATED: "Resource updated successfully",
    DELETED: "Resource deleted successfully",
    LOGIN: "Login successful",
    LOGOUT: "Logout successful",
    REGISTER: "Registration successful",
  },
  ERROR: {
    NOT_FOUND: "Resource not found",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "Access denied",
    INVALID_CREDENTIALS: "Invalid email or password",
    EMAIL_EXISTS: "Email already exists",
    VALIDATION_ERROR: "Validation error",
    SERVER_ERROR: "Internal server error",
    OUT_OF_STOCK: "Product is out of stock",
    CART_EMPTY: "Cart is empty",
    INSUFFICIENT_STOCK: "Insufficient stock available",
    INVALID_ID: "Invalid ID format",
    TOKEN_EXPIRED: "Token expired. Please login again.",
    TOKEN_INVALID: "Invalid token. Please login again.",
    DATABASE_ERROR: "Database operation failed",
    DUPLICATE_ENTRY: "Entry already exists",
    MISSING_FIELDS: "Required fields are missing",
  },
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Database connection states
 */
export const DATABASE_STATES = {
  DISCONNECTED: 0,
  CONNECTED: 1,
  CONNECTING: 2,
  DISCONNECTING: 3,
};
