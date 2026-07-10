import express from "express";
import { getAdminDashboardStats, getAdminStats, getDailySubadminStats, getDashboardStats } from "../controllers/dashboardController.js";
import { validateAdmin } from "../middlewares/auth.js";
const router = express.Router();

router.get("/",validateAdmin, getDashboardStats);
router.get("/daily-subadmin-stats",validateAdmin,getDailySubadminStats);
// Admin-specific stats
router.get("/admin-stats",validateAdmin, getAdminStats);
router.get("/admin/count",getAdminDashboardStats);


export default router;