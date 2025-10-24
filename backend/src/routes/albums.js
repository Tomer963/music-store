import { Router } from "express";
import * as albumController from "../controllers/albumController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { 
  albumValidation, 
  albumUpdateValidation, // ✅ ייבוא הולידטור החדש לעדכון
  mongoIdValidation 
} from "../utils/validators.js";

const router = Router();

// Public routes
router.get("/", albumController.getAlbums);
router.get("/search", albumController.searchAlbums);
router.get("/new", albumController.getNewAlbums);
router.get(
  "/:id",
  mongoIdValidation,
  validateRequest,
  albumController.getAlbum
);

// Admin routes

// ✅ יצירת אלבום - משתמש ב-albumValidation (כל השדות חובה)
router.post(
  "/",
  authenticate,
  isAdmin,
  albumValidation,
  validateRequest,
  albumController.createAlbum
);

// ✅ עדכון אלבום - משתמש ב-albumUpdateValidation (שדות אופציונליים)
router.put(
  "/:id",
  authenticate,
  isAdmin,
  mongoIdValidation,
  albumUpdateValidation, // ✅ שינוי מ-albumValidation
  validateRequest,
  albumController.updateAlbum
);

router.delete(
  "/:id",
  authenticate,
  isAdmin,
  mongoIdValidation,
  validateRequest,
  albumController.deleteAlbum
);

export default router;