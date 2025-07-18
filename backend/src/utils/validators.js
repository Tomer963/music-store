/**
 * Validation rules
 * Contains all validation rules for request data
 */

import { body, query, param } from "express-validator";
import { VALIDATION } from "../config/constants.js";

// User validation rules
export const registerValidation = [
  body("firstName")
    .trim()
    .isLength({
      min: VALIDATION.MIN_NAME_LENGTH,
      max: VALIDATION.MAX_NAME_LENGTH,
    })
    .withMessage(
      `First name must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`
    ),

  body("lastName")
    .trim()
    .isLength({
      min: VALIDATION.MIN_NAME_LENGTH,
      max: VALIDATION.MAX_NAME_LENGTH,
    })
    .withMessage(
      `Last name must be between ${VALIDATION.MIN_NAME_LENGTH} and ${VALIDATION.MAX_NAME_LENGTH} characters`
    ),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(
      `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`
    )
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter"),
];

export const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

// Album validation rules
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

// Search validation
export const searchValidation = [
  query("q")
    .trim()
    .isLength({ min: VALIDATION.MIN_SEARCH_LENGTH })
    .withMessage(
      `Search query must be at least ${VALIDATION.MIN_SEARCH_LENGTH} characters`
    ),
];

// Cart validation
export const cartItemValidation = [
  body("albumId").isMongoId().withMessage("Invalid album ID"),

  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

// Order validation
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
    .matches(/^\d{5}$/)
    .withMessage("Zip code must be 5 digits"),

  body("billingInfo.phone")
    .trim()
    .matches(/^0\d{1,2}-\d{7}$/)
    .withMessage("Phone must be in format 03-1234567 or 050-1234567"),
];

// Credit card validation (conditional)
export const creditCardValidation = [
  body("paymentInfo.cardType")
    .if(body("paymentMethod").equals("credit_card"))
    .isIn(["visa", "mastercard", "direct"])
    .withMessage("Invalid card type"),

  body("paymentInfo.cardNumber")
    .if(body("paymentMethod").equals("credit_card"))
    .matches(/^\d{16}$/)
    .withMessage("Card number must be 16 digits"),

  body("paymentInfo.expiryMonth")
    .if(body("paymentMethod").equals("credit_card"))
    .isInt({ min: 1, max: 12 })
    .withMessage("Invalid expiry month"),

  body("paymentInfo.expiryYear")
    .if(body("paymentMethod").equals("credit_card"))
    .isInt({ min: new Date().getFullYear() })
    .withMessage("Card has expired"),

  body("paymentInfo.cvv")
    .if(body("paymentMethod").equals("credit_card"))
    .matches(/^\d{3}$/)
    .withMessage("CVV must be 3 digits"),
];

// ID validation
export const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];