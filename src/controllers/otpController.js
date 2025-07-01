import axios from "axios";
import pool from "../config/db.js";
import crypto from "crypto";
import jwt from 'jsonwebtoken';
import { sendOtpViaEmail } from "../utils/sendOtpViaEmail.js";

// import twilio from 'twilio';

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// const sendViaTwilio = async (phone, otp) => {
//   try {
//     const message = await client.messages.create({
//       body: `Your OTP is ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: `+91${phone}`
//     });
//     console.log("OTP sent via Twilio:", message.sid);
//     return message;
//   } catch (error) {
//     console.error("Error sending OTP via Twilio:", error.message);
//     throw new Error("Failed to send OTP via SMS");
//   }
// };

// const sendViaFast2SMS = async (phone, otp) => {
//   const apiKey = process.env.FAST2SMS_API_KEY;

//   const payload = {
//     sender_id: 'FSTSMS',
//     message: `Your OTP is ${otp}. Do not share it with anyone.`,
//     language: 'english',
//     route: 'p',
//     numbers: phone,
//     // template_id: 'your_dlt_template_id' // if using DLT template
//   };

//   try {
//     console.log("Sending SMS with payload:", payload);

//     const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, {
//       headers: {
//         authorization: apiKey,
//         'Content-Type': 'application/json',
//       },
//     });

//     console.log("Fast2SMS Response:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Fast2SMS Error:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: error.message,
//     });
//     throw new Error("Failed to send OTP via Fast2SMS");
//   }
// };

// const sendViaTextLocal = async (phone, otp) => {
//   const apiKey = process.env.TEXTLOCAL_API_KEY;
//   const sender = process.env.TEXTLOCAL_SENDER || 'TXTLCL'; // DLT Sender ID or default
//   const message = `Your OTP is ${otp}. Do not share it with anyone.`;

//   const data = {
//     apikey: apiKey,
//     numbers: `91${phone}`, 
//     message,
//     sender,
//   };

//   try {
//     const response = await axios.post( 'https://api.textlocal.in/send/', querystring.stringify(data), 
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       }
//     );

//     console.log('TextLocal response:', response.data);
//     if (response.data.status !== 'success') {
//       throw new Error(response.data.warnings?.[0]?.message || 'SMS failed');
//     }

//     return response.data;
//   } catch (error) {
//     console.error('TextLocal Error:', error.response?.data || error.message);
//     throw new Error('Failed to send OTP via TextLocal');
//   }
// };

// const normalizePhone = (phone) => phone.replace(/\D+/g, "").trim();

// Send OTP API
export const sendOTP = async (req, res) => {
  try {
    let { email } = req.body;
    console.log("Received from frontend:", req.body);

    if ( !email) return res.status(400).json({ msg: "Email is required" });
    
    // phone = normalizePhone(phone);
    // if (!/^\d{10}$/.test(phone)) {
    //   return res.status(400).json({ msg: "Invalid phone number" });
    // }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email) && !email.endsWith("@majhinavimumbai.com")) {
      return res.status(400).json({ msg: "Invalid email format. Only @gmail.com is allowed." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(`Generated OTP for ${email}: ${otp}`);

     // Send OTP using Nodemailer
     await sendOtpViaEmail(email, otp);

    const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

    const [[{ dailyCount, last15MinCount }]] = await pool.query(
      `SELECT 
       COUNT(*) AS dailyCount, 
       COUNT(CASE WHEN created_at > NOW() - INTERVAL 15 MINUTE THEN 1 END) AS last15MinCount 
       FROM otp_verifications 
       WHERE email = ? 
       AND DATE(created_at) = CURDATE()`,
      [email]
    );

    if (dailyCount >= 10) {
      return res.status(429).json({ msg: "Daily OTP limit reached. Try again tomorrow." });
    }

    if (last15MinCount >= 3) {
      return res.status(429).json({ msg: "You can request OTP only 3 times in 15 minutes." });
    }

    // const otp = generateOTP();
    // console.log(`Generated OTP for ${phone}: ${otp}`);    
    // await sendViaFast2SMS(phone, otp); 
    // await sendViaTextLocal (phone,otp);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO otp_verifications (name, email, otp, expires_at) 
         VALUES ( ?, ?, ?, NOW() + INTERVAL ${OTP_EXPIRY_MINUTES} MINUTE)`,
        [ "", email, otp]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({ msg: "OTP sent to your email address", otp });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ msg: "Something went wrong. Please Try again.", error: error.message });
  }
};

// Verify OTP API
export const verifyOTP = async (req, res) => {
  try {
    const { name, email, otp } = req.body;
    console.log("Received in verifyOTP:", { name:"", email, otp });
    if ( !email || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required" });
    }

    const [[otpRecord]] = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE email = ? 
       AND otp = ? 
       AND expires_at > NOW()`,
      [email, otp]
    );

    if (!otpRecord) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[existingUser]] = await conn.query(
        `SELECT id, role FROM users WHERE email = ? LIMIT 1`,
        [email]
      );

      if (existingUser?.is_verified) {
        return res.status(400).json({ msg: "Your email is already verified." });
      }

      let userId, role;
      if (existingUser) {
        userId = existingUser.id;
        role = existingUser.role;

      } else {
        const [result] = await conn.query(
          `INSERT INTO users (name, email, role) VALUES (?, ?, 'user')`,
          ["", email]
        );
        userId = result.insertId;
        role = "user";
      }

      await conn.commit();
      conn.release();

      const token = jwt.sign({ userId, email, role }, process.env.JWT_SECRET, {expiresIn: "15d",});

      return res.status(200).json({ msg: "OTP verified successfully", role, token });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ msg: "Failed to Verify OTP. Please try Again.", error: error.message });
  }
};