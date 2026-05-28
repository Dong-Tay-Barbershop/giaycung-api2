import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as ctrl from "../controllers/order.controller";

const router = Router();

router.get("/", asyncHandler(ctrl.list));
router.post("/", asyncHandler(ctrl.create));                       // public
router.get("/:id", asyncHandler(ctrl.getOne));
router.patch("/:id", requireAdmin, asyncHandler(ctrl.update));
router.delete("/:id", requireAdmin, asyncHandler(ctrl.remove));   // soft delete → cancelled

export default router;
