import pool from "../config/db.js";
import crypto from "crypto";
import jwt from 'jsonwebtoken';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendViaTwilio = async (phone, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`
    });
    console.log("OTP sent via Twilio:", message.sid);
    return message;
  } catch (error) {
    console.error("Error sending OTP via Twilio:", error.message);
    throw new Error("Failed to send OTP via SMS");
  }
};

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const normalizePhone = (phone) => phone.replace(/\D+/g, "").trim();

// Send OTP API
export const sendOTP = async (req, res) => {
  try {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ msg: "Phone is required" });

    phone = normalizePhone(phone);
    const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

    const [[{ dailyCount, last15MinCount }]] = await pool.query(
      `SELECT 
       COUNT(*) AS dailyCount, 
       COUNT(CASE WHEN created_at > NOW() - INTERVAL 15 MINUTE THEN 1 END) AS last15MinCount 
       FROM otp_verifications 
       WHERE phone = ? 
       AND DATE(created_at) = CURDATE()`,
      [phone]
    );

    if (dailyCount >= 10) {
      return res.status(429).json({ msg: "Daily OTP limit reached. Try again tomorrow." });
    }

    if (last15MinCount >= 3) {
      return res.status(429).json({ msg: "You can request OTP only 3 times in 15 minutes." });
    }

    const otp = generateOTP();
    console.log(`Generated OTP for ${phone}: ${otp}`);
    // await sendViaTwilio(phone, otp);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO otp_verifications (phone, otp, expires_at) 
         VALUES (?, ?, NOW() + INTERVAL ? MINUTE)`,
        [phone, otp, OTP_EXPIRY_MINUTES]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({ msg: "OTP sent successfully",otp });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// Verify OTP API
export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ msg: "Phone and OTP are required" });
    }

    const [[otpRecord]] = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE phone = ? 
       AND otp = ? 
       AND expires_at > NOW()`,
      [phone, otp]
    );

    if (!otpRecord) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[existingUser]] = await conn.query(
        `SELECT id, role FROM users WHERE phone = ? LIMIT 1`,
        [phone]
      );

      let userId, role;
      if (existingUser) {
        userId = existingUser.id;
        role = existingUser.role;
      } else {
        const [result] = await conn.query(
          `INSERT INTO users (phone, role) VALUES (?, 'user')`,
          [phone]
        );
        userId = result.insertId;
        role = "user";
      }

      await conn.commit();
      conn.release();

      const token = jwt.sign({ userId, phone, role }, process.env.JWT_SECRET, {expiresIn: "15d",});

      return res.status(200).json({ msg: "OTP verified successfully", role, token });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};