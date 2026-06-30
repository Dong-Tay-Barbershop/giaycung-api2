import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../middleware/errorHandler";
import { requireVietQrCallbackToken } from "../middleware/vietqrAuth";
import * as ctrl from "../controllers/vietqr.controller";

const router = Router();

const callbackJson = express.json({ limit: "16kb" });

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "FAILED", message: "RATE_LIMITED" },
  skip: () => process.env.NODE_ENV === "test",
});

router.post("/api/token_generate", callbackJson, tokenLimiter, asyncHandler(ctrl.tokenGenerate));
router.post(
  "/bank/api/transaction-sync",
  callbackJson,
  requireVietQrCallbackToken,
  asyncHandler(ctrl.transactionSync)
);

export default router;
