import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// import User from "../models/userModel.js";
import pool from "../config/db.js";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};


// export const getUserProfile = async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     res.status(200).json({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//     });
//   } catch (error) {
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

// export const updateUserProfile = async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     user.name = req.body.name || user.name;
//     user.phone = req.body.phone || user.phone;

//     if (req.body.password) {
//       user.password = await bcrypt.hash(req.body.password, 10);
//     }

//     await user.save();

//     res.status(200).json({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       token: generateToken(user.id),
//     });
//   } catch (error) {
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

// @desc Get all users (Admin Only)
// @route GET /api/users
// @access Private/Admin

export const getAllUsers = async (req, res) => {
  try {
    const query = `
    SELECT id,name,email,phone,profile_image,is_active FROM users WHERE role='user' 
  `;
  const [users] = await pool.query(query);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


// export const deleteUser = async (req, res) => {
//   try {
//     const user = await User.findByPk(req.params.id);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     await user.destroy();
//     res.status(200).json({ msg: "User deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };
