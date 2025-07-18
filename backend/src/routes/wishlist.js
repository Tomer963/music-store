/**
 * Wishlist routes
 * Defines all wishlist-related endpoints
 */

import { Router } from "express";
import * as wishlistController from "../controllers/wishlistController.js";
import { authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { albumIdValidation } from "../utils/validators.js";

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get("/", wishlistController.getWishlist);
router.post(
  "/:albumId",
  albumIdValidation,
  validateRequest,
  wishlistController.addToWishlist
);
router.delete(
  "/:albumId",
  albumIdValidation,
  validateRequest,
  wishlistController.removeFromWishlist
);

export default router;