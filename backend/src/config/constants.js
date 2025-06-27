/**
 * Application constants
 * Central location for all constant values
 */

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
};

export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const PAYMENT_METHODS = {
  CREDIT_CARD: "credit_card",
  CHECK: "check",
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 100,
};

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 12,
  MIN_SEARCH_LENGTH: 3,
};

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
    INVALID_CREDENTIALS: "Invalid email or password",
    EMAIL_EXISTS: "Email already exists",
    VALIDATION_ERROR: "Validation error",
    SERVER_ERROR: "Internal server error",
    OUT_OF_STOCK: "Product is out of stock",
  },
};
