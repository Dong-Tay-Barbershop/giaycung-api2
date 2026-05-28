import { Router } from "express";
import { requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import * as ctrl from "@/controllers/message.controller";

const router = Router();

router.get("/", asyncHandler(ctrl.list));
router.post("/", asyncHandler(ctrl.create));           // public — từ form contact
router.patch("/", requireAdmin, asyncHandler(ctrl.update));
router.delete("/", requireAdmin, asyncHandler(ctrl.remove));

export default router;
