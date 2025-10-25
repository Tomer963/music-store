import { body, param } from "express-validator";
import { VALIDATION, PAYMENT_METHODS } from "../config/constants.js";

// Reusable validation components
const nameValidation = (field) =>
  body(field)
    .trim()
    .isLength({ min: VALIDATION.MIN_NAME_LENGTH, max: VALIDATION.MAX_NAME_LENGTH })
    .withMessage(
      `${field} must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`
    );

const emailValidation = () =>
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email");

const passwordValidation = () =>
  body("password")
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter");

const sessionIdValidation = () =>
  body("sessionId")
    .optional()
    .isString()
    .withMessage("SessionId must be a string");

// Auth validations
export const registerValidation = [
  nameValidation("firstName"),
  nameValidation("lastName"),
  emailValidation(),
  passwordValidation(),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  sessionIdValidation(),
];

export const loginValidation = [
  emailValidation(),
  body("password").notEmpty().withMessage("Password is required"),
  sessionIdValidation(),
];

// Album validations
const albumFieldValidations = {
  title: () =>
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Album title is required")
      .isLength({ max: 100 })
      .withMessage("Album title cannot exceed 100 characters"),
  artist: () =>
    body("artist")
      .trim()
      .notEmpty()
      .withMessage("Artist name is required")
      .isLength({ max: 100 })
      .withMessage("Artist name cannot exceed 100 characters"),
  category: () =>
    body("category").isMongoId().withMessage("Invalid category ID"),
  releaseYear: () =>
    body("releaseYear")
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage("Invalid release year"),
  price: () =>
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
  stock: () =>
    body("stock")
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer"),
  description: () =>
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
};

export const albumValidation = Object.values(albumFieldValidations).map((fn) => fn());

export const albumUpdateValidation = [
  body("title").optional().trim().notEmpty().isLength({ max: 100 }),
  body("artist").optional().trim().notEmpty().isLength({ max: 100 }),
  body("category").optional().isMongoId(),
  body("releaseYear").optional().isInt({ min: 1900, max: new Date().getFullYear() }),
  body("price").optional().isFloat({ min: 0 }),
  body("stock").optional().isInt({ min: 0 }),
  body("description").optional().trim().notEmpty().isLength({ max: 500 }),
];

// Category validations
export const categoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 50 })
    .withMessage("Category name cannot exceed 50 characters"),
];

export const categoryUpdateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 50 }),
];

// Cart validations
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
  sessionIdValidation(),
  body().custom((value, { req }) => {
    const allowedFields = ["albumId", "quantity", "sessionId"];
    const receivedFields = Object.keys(req.body);
    const extraFields = receivedFields.filter((field) => !allowedFields.includes(field));

    if (extraFields.length > 0) {
      throw new Error(`Unexpected fields: ${extraFields.join(", ")}`);
    }
    return true;
  }),
];

export const quantityValidation = [
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

// Order validations
export const orderValidation = [
  body("paymentMethod")
    .isIn(Object.values(PAYMENT_METHODS))
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

// ID validations
export const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];

export const albumIdValidation = [
  param("albumId").isMongoId().withMessage("Invalid album ID format"),
];