import express from "express";
import { approveBusiness, blockUser } from "../controllers/adminController.js";
import { authenticateAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.put("/business/approve/:id", authenticateAdmin, approveBusiness);
router.put("/user/block/:id", authenticateAdmin, blockUser);

export default router;
