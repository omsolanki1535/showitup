import { Router } from "express";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { getAdminDashboard, updateUserRole, deleteUser } from "../controllers/admin.controller.js";

const router = Router();
router.use(authenticateAdmin);
router.get("/dashboard", getAdminDashboard);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

export default router;
