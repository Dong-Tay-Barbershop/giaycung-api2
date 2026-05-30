import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getAdmins, addAdmin, changePasswordHandler } from "../controllers/admin.controller";

const router = Router();

router.get("/users", requireAdmin, asyncHandler(getAdmins));
router.post("/users", requireAdmin, asyncHandler(addAdmin));
router.put("/change-password", requireAdmin, asyncHandler(changePasswordHandler));

export default router;
