import express from "express";
import { getDailySubadminStats, getDashboardStats } from "../controllers/dashboardController.js";
import { validateAdmin } from "../middlewares/auth.js";
const router = express.Router();

router.get("/",validateAdmin, getDashboardStats);
router.get("/daily-subadmin-stats",validateAdmin,getDailySubadminStats)

export default router;