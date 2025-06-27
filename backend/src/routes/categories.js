/**
 * Category routes
 * Defines all category-related endpoints
 */

import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { mongoIdValidation } from "../utils/validators.js";
import { body } from "express-validator";

const router = Router();

// Category validation
const categoryValidation = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
  body("description").optional().trim(),
];

// Public routes
router.get("/", categoryController.getCategories);
router.get(
  "/:id/albums",
  mongoIdValidation,
  validateRequest,
  categoryController.getAlbumsByCategory
);

// Admin routes
router.post(
  "/",
  authenticate,
  isAdmin,
  categoryValidation,
  validateRequest,
  categoryController.createCategory
);
router.put(
  "/:id",
  authenticate,
  isAdmin,
  mongoIdValidation,
  categoryValidation,
  validateRequest,
  categoryController.updateCategory
);
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  mongoIdValidation,
  validateRequest,
  categoryController.deleteCategory
);

export default router;
