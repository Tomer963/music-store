import { validationResult } from "express-validator";
import { MESSAGES } from "../config/constants.js";

/**
 * validateRequest
 * Checks validation results and returns errors if any
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @return {void}
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
