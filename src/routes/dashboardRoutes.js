import express from "express";
import { getAdminStats, getDailySubadminStats, getDashboardStats } from "../controllers/dashboardController.js";
import { validateAdmin } from "../middlewares/auth.js";
const router = express.Router();

router.get("/",validateAdmin, getDashboardStats);
router.get("/daily-subadmin-stats",validateAdmin,getDailySubadminStats);
// Admin-specific stats
router.get("/admin-stats", getAdminStats);

export default router;