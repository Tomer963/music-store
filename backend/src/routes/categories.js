import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import {
  categoryValidation,
  categoryUpdateValidation,
  mongoIdValidation,
} from "../utils/validators.js";

const router = Router();

// Public routes
router.get("/", categoryController.getCategories);
router.get("/:id", mongoIdValidation, validateRequest, categoryController.getCategory);
router.get("/:id/albums", mongoIdValidation, validateRequest, categoryController.getAlbumsByCategory);

// Admin routes
router.post("/", authenticate, isAdmin, categoryValidation, validateRequest, categoryController.createCategory);
router.put("/:id", authenticate, isAdmin, mongoIdValidation, categoryUpdateValidation, validateRequest, categoryController.updateCategory);
router.delete("/:id", authenticate, isAdmin, mongoIdValidation, validateRequest, categoryController.deleteCategory);

export default router;