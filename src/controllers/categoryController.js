import pool from "../config/db.js";

export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(`SELECT id,name,image from category`);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
