import { Router } from "express";
import * as cartController from "../controllers/cartController.js";
import { optionalAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { cartItemValidation, mongoIdValidation, quantityValidation } from "../utils/validators.js";

const router = Router();

router.use(optionalAuth);

router.get("/", cartController.getCart);
router.post("/items", cartItemValidation, validateRequest, cartController.addToCart);
router.put("/items/:id", mongoIdValidation, quantityValidation, validateRequest, cartController.updateCartItem);
router.delete("/items/:id", mongoIdValidation, validateRequest, cartController.removeFromCart);
router.delete("/", cartController.clearCart);

export default router;