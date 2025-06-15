import express from "express";
import { initiatePayment, verifyPayment } from "../controllers/paymentController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();

router.post("/initiate", validateUser, initiatePayment);
router.post("/verify", validateUser, verifyPayment);

export default router;
