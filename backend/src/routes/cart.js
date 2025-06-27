/**
 * Cart routes
 * Defines all cart-related endpoints
 */

import { Router } from "express";
import * as cartController from "../controllers/cartController.js";
import { optionalAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { cartItemValidation, mongoIdValidation } from "../utils/validators.js";
import { body } from "express-validator";

const router = Router();

// Quantity validation
const quantityValidation = [
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

// All cart routes use optional auth
router.use(optionalAuth);

router.get("/", cartController.getCart);
router.post(
  "/items",
  cartItemValidation,
  validateRequest,
  cartController.addToCart
);
router.put(
  "/items/:id",
  mongoIdValidation,
  quantityValidation,
  validateRequest,
  cartController.updateCartItem
);
router.delete(
  "/items/:id",
  mongoIdValidation,
  validateRequest,
  cartController.removeFromCart
);
router.delete("/", cartController.clearCart);

export default router;
