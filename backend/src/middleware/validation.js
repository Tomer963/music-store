import { validationResult } from "express-validator";
import { formatValidationErrors } from "../utils/helpers.js";
import { ValidationError } from "./errorHandler.js";

/**
 * validateRequest
 *
 * Middleware to check validation results and throw errors if any
 * Works with express-validator validation chains
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into consistent structure
    const formattedErrors = formatValidationErrors(errors.array());
    throw new ValidationError(formattedErrors);
  }

  next();
};
