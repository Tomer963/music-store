/**
 * Authentication routes
 * Defines all auth-related endpoints
 */

import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { registerValidation, loginValidation } from "../utils/validators.js";

const router = Router();

// Public routes
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register
);
router.post("/login", loginValidation, validateRequest, authController.login);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);
router.get("/logout", authenticate, authController.logout);

export default router;
