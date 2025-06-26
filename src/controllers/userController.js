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

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [rows] = await pool.query("SELECT id, name, email, phone, profile_image, created_at FROM users WHERE id = ?", [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// export const blockUser = (req, res) => {
//   const id = req.params.id;

//   if (!id) {
//     return res.status(400).json({ message: 'User ID is required' });
//   }

//   const query = 'UPDATE users SET status = ? WHERE id = ?';

//   pool.query(query, ['blocked', id], (error, results) => {
//     if (error) {
//       console.error('Database error:', error);
//       return res.status(500).json({ message: 'Error blocking user', error });
//     }

//     if (results.affectedRows === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     return res.status(200).json({ message: 'User blocked successfully' });
//   });
// };


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

// Post
export const createUser = async (req, res) => {
  const { name, phone, email } = req.body;

  // Validations
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: "Phone must be 10 digits." });
  }

  if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  try {
    const [existing] = await pool.query("SELECT * FROM users WHERE phone = ?", [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Phone number already registered." });
    }

    await pool.query(
      "INSERT INTO users (name, phone, email, is_active) VALUES (?, ?, ?, ?)",
      [name || null, phone, email || null, 1]
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
