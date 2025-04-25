import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const validateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Authorization token missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, 'JWT_SECRET'); 
    } catch (err) {
      return res.status(401).json({ msg: "Invalid or expired token" });
    }

    const { userId } = decoded;

    const [[user]] = await pool.query(
      `SELECT id, phone, role FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    // Attach user to request for downstream access
    req.user = user;
    next();
  } catch (error) {
    console.error("Error validating token:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};
