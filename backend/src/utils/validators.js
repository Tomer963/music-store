import { body, param } from "express-validator";
import { VALIDATION } from "../config/constants.js";

/**
 * Registration validation rules
 */
export const registerValidation = [
  body("firstName")
    .trim()
    .isLength({
      min: VALIDATION.MIN_NAME_LENGTH,
      max: VALIDATION.MAX_NAME_LENGTH,
    })
    .withMessage(
      `First name must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`,
    ),

  body("lastName")
    .trim()
    .isLength({
      min: VALIDATION.MIN_NAME_LENGTH,
      max: VALIDATION.MAX_NAME_LENGTH,
    })
    .withMessage(
      `Last name must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`,
    ),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(
      `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`,
    )
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter"),

  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),

  body("sessionId")
    .optional()
    .isString()
    .withMessage("SessionId must be a string"),
];

/**
 * Login validation rules
 */
export const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),

  body("sessionId")
    .optional()
    .isString()
    .withMessage("SessionId must be a string"),
];

/**
 * Album creation validation rules (all fields required)
 */
export const albumValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Album title is required")
    .isLength({ max: 100 })
    .withMessage("Album title cannot exceed 100 characters"),

  body("artist")
    .trim()
    .notEmpty()
    .withMessage("Artist name is required")
    .isLength({ max: 100 })
    .withMessage("Artist name cannot exceed 100 characters"),

  body("category").isMongoId().withMessage("Invalid category ID"),

  body("releaseYear")
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage("Invalid release year"),

  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

/**
 * Album update validation rules (all fields optional)
 */
export const albumUpdateValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Album title cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Album title cannot exceed 100 characters"),

  body("artist")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Artist name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Artist name cannot exceed 100 characters"),

  body("category").optional().isMongoId().withMessage("Invalid category ID"),

  body("releaseYear")
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage("Invalid release year"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

/**
 * Category creation validation rules (name required)
 */
export const categoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 50 })
    .withMessage("Category name cannot exceed 50 characters"),
];

/**
 * Category update validation rules (name optional)
 */
export const categoryUpdateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .isLength({ max: 50 })
    .withMessage("Category name cannot exceed 50 characters"),
];

/**
 * Cart item validation rules
 */
export const cartItemValidation = [
  body("albumId")
    .exists()
    .withMessage("Album ID is required")
    .isMongoId()
    .withMessage("Invalid album ID"),

  body("quantity")
    .exists()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("sessionId")
    .optional()
    .isString()
    .withMessage("SessionId must be a string"),

  // Reject any unexpected fields
  body().custom((value, { req }) => {
    const allowedFields = ["albumId", "quantity", "sessionId"];
    const receivedFields = Object.keys(req.body);
    const extraFields = receivedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (extraFields.length > 0) {
      throw new Error(`Unexpected fields: ${extraFields.join(", ")}`);
    }

    return true;
  }),
];

/**
 * Order creation validation rules
 */
export const orderValidation = [
  body("paymentMethod")
    .isIn(["credit_card", "check"])
    .withMessage("Invalid payment method"),

  body("billingInfo.address")
    .trim()
    .matches(/^.{3,}.*\d+/)
    .withMessage("Address must contain at least 3 letters and a number"),

  body("billingInfo.city")
    .trim()
    .isAlpha("en-US", { ignore: " " })
    .isLength({ min: 3 })
    .withMessage("City must contain only letters and be at least 3 characters"),

  body("billingInfo.zipCode")
    .trim()
    .matches(/^\d{5}$|^\d{7}$/)
    .withMessage("Zip code must be 5 or 7 digits"),

  body("billingInfo.phone")
    .trim()
    .matches(/^0\d{1,2}-\d{7}$/)
    .withMessage("Phone must be in format 03-1234567 or 050-1234567"),
];

/**
 * MongoDB ID validation for route parameters
 */
export const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];

/**
 * Album ID validation for route parameters
 */
export const albumIdValidation = [
  param("albumId").isMongoId().withMessage("Invalid album ID format"),
];
