import express from "express";
import { initiatePayment, verifyPayment } from "../controllers/paymentController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initiate", authenticateUser, initiatePayment);
router.post("/verify", authenticateUser, verifyPayment);

export default router;
