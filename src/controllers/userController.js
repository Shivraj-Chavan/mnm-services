import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

export const updateUserProfile = async (req, res) => {
  // try {
    // const user = await User.findByPk(req.user.id);
    // if (!user) return res.status(404).json({ msg: "User not found" });

    // user.name = req.body.name || user.name;
    // user.phone = req.body.phone || user.phone;

    // if (req.body.password) {
    //   user.password = await bcrypt.hash(req.body.password, 10);
    // }

    // await user.save();

    try {
      const { id } = req.params;
      const { name, phone, email, is_active } = req.body;
    
      const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ msg: "User not found" });
      }
    
      const existingUser = rows[0];
      const updatedName = name || existingUser.name;
      const updatedEmail = email || existingUser.email;
      const updatedPhone = phone || existingUser.phone;
      const activeStatus = parseInt(is_active);
      const updatedStatus = [0, 1].includes(activeStatus) ? activeStatus : existingUser.is_active;
    
      await pool.execute(
        "UPDATE users SET name = ?, email = ?, phone = ?, is_active = ? WHERE id = ?",
        [updatedName, updatedEmail, updatedPhone, updatedStatus, id]
      );
    
      res.status(200).json({
        id,
        name: updatedName,
        email: updatedEmail,
        phone: updatedPhone,
        is_active: updatedStatus,
        token: generateToken(id),
      });
    } catch (error) {
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  } 


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
