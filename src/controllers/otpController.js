import { find, insert, update, remove } from "../utils/dao.js";
import logger from "../config/logger.js";
import moment from "moment";

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtpForLogin = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ msg: "Phone number is required" });

    const otp = generateOtp();
    const expiresAt = moment().add(5, "minutes").format("YYYY-MM-DD HH:mm:ss");

    const existingOtp = await find("otp_verifications", { phone });

    if (existingOtp.length) {
      await update("otp_verifications", { otp, expires_at: expiresAt }, { phone });
    } else {
      await insert("otp_verifications", { phone, otp, expires_at: expiresAt });
    }

    console.log(`OTP for ${phone}: ${otp}`);

    res.status(200).json({ msg: "OTP sent successfully" });
  } catch (error) {
    logger.error("Send OTP Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ msg: "Phone and OTP are required" });

    const storedOtp = await find("otp_verifications", { phone });
    if (!storedOtp.length) return res.status(400).json({ msg: "OTP expired or invalid" });

    const { otp: storedOtpValue, expires_at } = storedOtp[0];

    if (moment().isAfter(moment(expires_at))) {
      await remove("otp_verifications", { phone });
      return res.status(400).json({ msg: "OTP expired" });
    }

    if (storedOtpValue !== otp) return res.status(400).json({ msg: "Incorrect OTP" });

    await remove("otp_verifications", { phone });

    res.status(200).json({ msg: "OTP verified successfully" });
  } catch (error) {
    logger.error("Verify OTP Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
