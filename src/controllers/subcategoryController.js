import pool from "../config/db.js";

export const getCategoriesWithSubcategories = async (req, res) => {
  try {
    const query = `
      SELECT c.id AS category_id, c.name AS category_name,c.image AS category_image, 
             s.id AS subcategory_id, s.name AS subcategory_name,s.image AS subcategory_image
      FROM category c
      LEFT JOIN subcategory s ON c.id = s.category_id
      ORDER BY c.id, s.id;
    `;

    const [rows] = await pool.query(query);

    const categoriesMap = new Map();

    rows.forEach((row) => {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          id: row.category_id,
          name: row.category_name,
          image:row.category_image,
          subcategories: [],
        });
      }
      if (row.subcategory_id) {
        categoriesMap.get(row.category_id).subcategories.push({
          id: row.subcategory_id,
          name: row.subcategory_name,
          image: row.subcategory_image,
        });
      }
    });

    const result = Array.from(categoriesMap.values());

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const getSubcategoriesByCategoryId = async (req, res) => {
  try {
    const { category_id } = req.params; 

    const query = `
      SELECT id, name ,image
      FROM subcategory 
      WHERE category_id = ? 
      ORDER BY id;
    `;

    const [subcategories] = await pool.query(query, [category_id]);

    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
