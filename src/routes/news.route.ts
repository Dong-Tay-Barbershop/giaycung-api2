import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as ctrl from "../controllers/news.controller";

const router = Router();

router.get("/", asyncHandler(ctrl.list));
router.post("/", requireAdmin, asyncHandler(ctrl.create));
router.patch("/", requireAdmin, asyncHandler(ctrl.update));
router.delete("/", requireAdmin, asyncHandler(ctrl.remove));

export default router;
