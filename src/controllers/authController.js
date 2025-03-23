import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { find, insert } from "../utils/dao.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser = await find("users", { email, phone });
    if (existingUser.length) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await insert("users", { name, email, phone, password: hashedPassword, role });

    res.status(201).json({ msg: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await find("users", { phone });
    if (!user.length) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user[0].id, role: user[0].role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ token, user: { id: user[0].id, name: user[0].name, role: user[0].role } });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const logout = (req, res) => {
  res.status(200).json({ msg: "User logged out" });
};
