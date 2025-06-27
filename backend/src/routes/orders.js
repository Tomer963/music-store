/**
 * Order routes
 * Defines all order-related endpoints
 */

import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import {
  orderValidation,
  creditCardValidation,
  mongoIdValidation,
} from "../utils/validators.js";

const router = Router();

// All order routes require authentication
router.use(authenticate);

router.get("/", orderController.getOrders);
router.get(
  "/:id",
  mongoIdValidation,
  validateRequest,
  orderController.getOrder
);
router.post(
  "/",
  orderValidation,
  creditCardValidation,
  validateRequest,
  orderController.createOrder
);

export default router;
