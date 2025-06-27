/**
 * Validation middleware
 * Handles request validation using express-validator
 */

import { validationResult } from "express-validator";
import { MESSAGES } from "../config/constants.js";

/**
 * Check validation results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.ERROR.VALIDATION_ERROR,
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }

  next();
};
