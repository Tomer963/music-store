import { validationResult } from "express-validator";
import { formatValidationErrors } from "../utils/helpers.js";
import { ValidationError } from "./errorHandler.js";

/**
 * validateRequest
 *
 * Middleware to check validation results and return errors if any
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    throw new ValidationError(formattedErrors);
  }

  next();
};