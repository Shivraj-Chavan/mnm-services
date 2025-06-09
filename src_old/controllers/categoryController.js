import pool from "../config/db.js";

export const getAllCategoriesSubcategories = async (req, res) => {
  try {
    const query = `
      SELECT c.id AS category_id, c.name AS category_name,c.slug AS category_slug, 
             s.id AS subcategory_id, s.name AS subcategory_name, s.slug AS subcategory_slug
      FROM category c
      LEFT JOIN subcategory s ON c.id = s.category_id
      ORDER BY c.id, s.id;
    `;
    const [rows] = await pool.query(query);
    const categoriesMap = {};
    rows.forEach((row) => {
      if (!categoriesMap[row.category_id]) {
        categoriesMap[row.category_id] = {
          id:row.category_id,
          name: row.category_name,
          slug: row.category_slug,
          subcategories: [],
        };
      }

      if (row.subcategory_id) {
        categoriesMap[row.category_id].subcategories.push({
          id:row.subcategory_id,
          name: row.subcategory_name,
          slug: row.subcategory_slug,
        });
      }
    });
    const result = Object.values(categoriesMap);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

    
export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(`SELECT id, name ,slug FROM category order by name asc`);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
