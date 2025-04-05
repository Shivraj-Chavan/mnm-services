import pool from "../config/db.js";

const generateSlug = (name) => 
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');



export const getCategoriesWithSubcategories = async (req, res) => {
  try {
    const query = `
      SELECT c.id AS category_id, c.name AS category_name, 
             s.id AS subcategory_id, s.name AS subcategory_name
      FROM category c
      LEFT JOIN subcategory s ON c.id = s.category_id
      ORDER BY c.id, s.id;
    `;

    const [rows] = await pool.query(query);

    const categoriesMap = new Map();

    rows.forEach((row) => {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          name: row.category_name,
          slug: generateSlug(row.category_name),
          subcategories: [],
        });
      }
      if (row.subcategory_id) {
        categoriesMap.get(row.category_id).subcategories.push({
          name: row.subcategory_name,
          slug: generateSlug(row.subcategory_name),
        });
      }
    });

    const result = Array.from(categoriesMap.values());

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getSubcategoriesByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT s.id, s.name, s.image 
      FROM subcategory s
      JOIN category c ON s.category_id = c.id
      WHERE LOWER(REPLACE(REPLACE(c.name, ' ', '-'), '&', 'and')) = ?
      ORDER BY s.id;
    `;

    const [subcategories] = await pool.query(query, [slug]);

    if (subcategories.length === 0) {
      return res.status(404).json({ msg: "Category not found or has no subcategories" });
    }

    const formattedSubcategories = subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: generateSlug(sub.name),
      image: sub.image || `${generateSlug(sub.name)}.jpg`,
    }));

    res.status(200).json(formattedSubcategories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
