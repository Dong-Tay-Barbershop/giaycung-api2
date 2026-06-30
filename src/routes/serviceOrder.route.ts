import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as ctrl from "../controllers/serviceOrder.controller";
import {
  adminConfirmCashPayment,
  adminManualMarkPaid,
  generateServiceOrderQr,
  publicGenerateQr,
  publicPaymentStatus,
} from "../controllers/vietqr.controller";

const router = Router();

const skipInTests = () => process.env.NODE_ENV === "test";

const publicPaymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many payment requests" },
  skip: skipInTests,
});

const publicStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many payment status requests" },
  skip: skipInTests,
});

// Admin click thanh toán không bao giờ vượt vài lần / phút trong thực tế.
// Limit 20/phút đủ rộng cho thao tác hợp lệ, nhưng chặn FE loop hoặc double-submit.
const adminPaymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Quá nhiều thao tác thanh toán, thử lại sau ít phút" },
  skip: skipInTests,
});

// ===== PUBLIC =====
router.get("/", asyncHandler(ctrl.list));
router.get("/track", asyncHandler(ctrl.track));                                   // ?order=ORD-001
router.get(
  "/track/:code/payment-status",
  publicStatusLimiter,
  asyncHandler(publicPaymentStatus)
);                                                                                // GET payment + QR by orderNumber
router.post(
  "/track/:code/payment/vietqr",
  publicPaymentLimiter,
  asyncHandler(publicGenerateQr)
);                                                                                // POST → tạo/refresh QR (khách dùng)
router.get("/:id", asyncHandler(ctrl.getOne));

// ===== ADMIN — orders =====
router.post("/", requireAdmin, asyncHandler(ctrl.create));
router.patch("/:id", requireAdmin, asyncHandler(ctrl.update));
router.delete("/:id", requireAdmin, asyncHandler(ctrl.remove));

// ===== ADMIN — payments =====
router.post(
  "/:id/payment/vietqr",
  requireAdmin,
  adminPaymentLimiter,
  asyncHandler(generateServiceOrderQr)
);
router.post(
  "/:id/payment/confirm-cash",
  requireAdmin,
  adminPaymentLimiter,
  asyncHandler(adminConfirmCashPayment)
);
router.post(
  "/:id/payment/manual-mark-paid",
  requireAdmin,
  adminPaymentLimiter,
  asyncHandler(adminManualMarkPaid)
);

// ===== ADMIN — shoes =====
router.post("/:id/shoes", requireAdmin, asyncHandler(ctrl.addShoe));
router.patch("/:id/shoes/:shoeId", requireAdmin, asyncHandler(ctrl.updateShoe));
router.delete("/:id/shoes/:shoeId", requireAdmin, asyncHandler(ctrl.deleteShoe));

export default router;
