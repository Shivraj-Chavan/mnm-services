import pool from "../config/db.js";

const generateSlug = (name) => 
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
    
export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(`SELECT id, name FROM category`);

    const categoriesWithImages = categories.map(category => {
      const slug = generateSlug(category.name);
      return {
        ...category,
        slug, 
      };
    });

    res.status(200).json(categoriesWithImages);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
