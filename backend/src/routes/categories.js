import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { 
  categoryValidation, 
  categoryUpdateValidation, // ✅ ייבוא הולידטור החדש לעדכון
  mongoIdValidation 
} from "../utils/validators.js";

const router = Router();

// Public routes
router.get("/", categoryController.getCategories);
router.get(
  "/:id",
  mongoIdValidation,
  validateRequest,
  categoryController.getCategory
);
router.get(
  "/:id/albums",
  mongoIdValidation,
  validateRequest,
  categoryController.getAlbumsByCategory
);

// Admin routes

// ✅ יצירת קטגוריה - משתמש ב-categoryValidation (כל השדות חובה)
router.post(
  "/",
  authenticate,
  isAdmin,
  categoryValidation,
  validateRequest,
  categoryController.createCategory
);

// ✅ עדכון קטגוריה - משתמש ב-categoryUpdateValidation (שדות אופציונליים)
router.put(
  "/:id",
  authenticate,
  isAdmin,
  mongoIdValidation,
  categoryUpdateValidation, // ✅ שינוי מ-categoryValidation
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