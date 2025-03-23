import express from "express";
import { sendOtpForLogin, verifyOtp } from "../controllers/otpController.js";

const router = express.Router();

router.post("/send", sendOtpForLogin);
router.post("/verify", verifyOtp);

export default router;
