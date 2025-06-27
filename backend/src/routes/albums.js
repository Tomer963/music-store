/**
 * Album routes
 * Defines all album-related endpoints
 */

import { Router } from "express";
import * as albumController from "../controllers/albumController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import {
  albumValidation,
  searchValidation,
  mongoIdValidation,
} from "../utils/validators.js";

const router = Router();

// Public routes
router.get("/", albumController.getAlbums);
router.get(
  "/search",
  searchValidation,
  validateRequest,
  albumController.searchAlbums
);
router.get("/new", albumController.getNewAlbums);
router.get(
  "/:id",
  mongoIdValidation,
  validateRequest,
  albumController.getAlbum
);

// Admin routes
router.post(
  "/",
  authenticate,
  isAdmin,
  albumValidation,
  validateRequest,
  albumController.createAlbum
);
router.put(
  "/:id",
  authenticate,
  isAdmin,
  mongoIdValidation,
  albumValidation,
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
