import { Router } from "express";
import { requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import * as ctrl from "@/controllers/serviceOrder.controller";

const router = Router();

// PUBLIC
router.get("/", asyncHandler(ctrl.list));
router.get("/track", asyncHandler(ctrl.track));        // trước /:id để tránh conflict
router.get("/:id", asyncHandler(ctrl.getOne));

// ADMIN — orders
router.post("/", requireAdmin, asyncHandler(ctrl.create));
router.patch("/:id", requireAdmin, asyncHandler(ctrl.update));
router.delete("/:id", requireAdmin, asyncHandler(ctrl.remove));

// ADMIN — shoes
router.post("/:id/shoes", requireAdmin, asyncHandler(ctrl.addShoe));
router.patch("/:id/shoes/:shoeId", requireAdmin, asyncHandler(ctrl.updateShoe));
router.delete("/:id/shoes/:shoeId", requireAdmin, asyncHandler(ctrl.deleteShoe));

export default router;
