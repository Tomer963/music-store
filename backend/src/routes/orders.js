import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import {
  orderValidation,
  mongoIdValidation,
} from "../utils/validators.js";

const router = Router();

// All order routes require authentication
router.use(authenticate);

// User routes
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
  validateRequest,
  orderController.createOrder
);

// Admin routes
router.get("/admin/all", isAdmin, orderController.getAllOrders);
router.get("/admin/statistics", isAdmin, orderController.getOrderStatistics);

router.put(
  "/:id",
  isAdmin,
  mongoIdValidation,
  validateRequest,
  orderController.updateOrder
);

router.delete(
  "/:id",
  isAdmin,
  mongoIdValidation,
  validateRequest,
  orderController.deleteOrder
);

export default router;