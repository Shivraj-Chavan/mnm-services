import axios from "axios";
import pool from "../config/db.js";
import crypto from "crypto";
import jwt from 'jsonwebtoken';
// import { smsUserRegistered } from "../utils/sendSms.js";
// import { sendSms } from "../utils/sendOtpviaPhone.js";
// import { sendOtpViaEmail } from "../utils/sendOtpViaEmail.js";

const normalizePhone = (phone) => phone.replace(/\D+/g, "").trim();

const sendOtpViaMSG91 = async (phone, otp) => {
  const options = {
    method: 'POST',
    url: 'https://control.msg91.com/api/v5/flow',
    headers: {
      accept: 'application/json',
      authkey: '461857Acajevnc7Mx6899c038P1',
      'content-type': 'application/json'
    },
    data: {
      template_id: '68a2c14473ea33076a03d8d4',
      realTimeResponse: "1",
      recipients: [
        {
          mobiles: `91${phone}`,
          var: otp,
        },
      ],
    },
  };

  try {
    const { data } = await axios.request(options);
    console.log(`MSG91 Response: ${data}`);
    return data;
  } catch (error) {
    console.error("MSG91 Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP via MSG91");
  }
};


// Send OTP API
export const sendOTP = async (req, res) => {
  try {
    let { phone } = req.body;
    console.log("Received from frontend:", req.body);

    if ( !phone) return res.status(400).json({ msg: "Phone Number is required" });
    
    phone = normalizePhone(phone);
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ msg: "Invalid phone number" });
    }

    // const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    // if (!emailRegex.test(email) && !email.endsWith("@majhinavimumbai.com")) {
    //   return res.status(400).json({ msg: "Invalid email format. Only @gmail.com is allowed." });
    // }

    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(`Generated OTP for ${phone}: ${otp}`);

     // Send OTP using Nodemailer
    //  await sendOtpViaEmail(phone, otp);
    // await sendOtpViaMSG91 (phone,otp);

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

    // if (dailyCount >= 10) {
    //   return res.status(429).json({ msg: "Daily OTP limit reached. Try again tomorrow." });
    // }

    if (last15MinCount >= 10) {
      return res.status(429).json({ msg: "You can request OTP only 10 times in 15 minutes." });
    }

    // const otp = generateOTP();
    // console.log(`Generated OTP for ${phone}: ${otp}`);    
    // await sendViaFast2SMS(phone, otp); 
    // await sendViaTextLocal (phone,otp);
    await sendOtpViaMSG91 (phone,otp);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO otp_verifications (name, phone, otp, expires_at) 
         VALUES ( ?, ?, ?, NOW() + INTERVAL ${OTP_EXPIRY_MINUTES} MINUTE)`,
        [ "", phone, otp]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({ msg: "OTP sent to your Phone Number vis SMS" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ msg: "Something went wrong. Please Try again.", error: error.message });
  }
};

// Verify OTP API
export const verifyOTP = async (req, res) => {
  try {
    const { name, phone, otp } = req.body;
    console.log("Received in verifyOTP:", { name:"", phone, otp });
    if ( !phone || !otp) {
      return res.status(400).json({ msg: "Phone Number and OTP are required" });
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
        `SELECT id, role,name,email,is_active FROM users WHERE phone = ? LIMIT 1`,
        [phone]
      );
      if (!existingUser?.is_active) {
        await conn.rollback();
        return res.status(403).json({
          success: false,
          message: "Your account has been blocked. Please contact the administrator."
        });
      }
      
      let userId,userName, role,userEmail;
      if (existingUser) {
        userId = existingUser.id;
        role = existingUser.role;
        userName=existingUser.name
        userEmail=existingUser.email
      } else {
        const [result] = await conn.query(
          `INSERT INTO users (name, phone, role) VALUES (?, ?, 'user')`,
          [ name || "", phone]
        );
        userId = result.insertId;
        role = "user";
        userEmail=result.email
        userName=''
      }

      await conn.commit();
      conn.release();
      let expiresIn = "15d";

        if (role === "sub-admin") {
          expiresIn = "12h";
        }
    
        const token = jwt.sign(
          { userId, phone, role },
          process.env.JWT_SECRET,
          { expiresIn }
        );

        // Send SMS vis Phone Number
        // await smsUserRegistered(phone);
        // await sendSms("registration", phone, { name: userName || "User" });
        return res.status(200).json({
          success: true,
          message: "OTP verified and user registered successfully",
          role,
          token,
          name: userName,
          userEmail
        });

      // const token = jwt.sign({ userId, phone, role }, process.env.JWT_SECRET, {expiresIn: "15d",});
      return res.status(200).json({ msg: "OTP verified successfully", role, token, name:userName,userEmail });
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