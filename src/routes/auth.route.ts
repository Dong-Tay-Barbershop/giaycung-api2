import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "@/middleware/errorHandler";
import { login } from "@/controllers/auth.controller";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút." },
});

router.post("/login", loginLimiter, asyncHandler(login));

export default router;
