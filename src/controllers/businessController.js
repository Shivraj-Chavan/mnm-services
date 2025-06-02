import slugify from "slugify";
import pool from "../config/db.js";
import path from "path";
import fs from 'fs/promises'; 
import { fileURLToPath } from 'url';
import db from '../config/db.js';

export const getUniqueSlug = async (name, area, excludeId = null) => {
  let baseSlug = slugify(`${name}-${area}`, { lower: true, strict: true });
  let uniqueSlug = baseSlug;
  let count = 1;

  let query = "SELECT slug FROM businesses WHERE slug = ?";
  let params = [uniqueSlug];

  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  let [existing] = await pool.query(query, params);

  while (existing.length > 0) {
    uniqueSlug = `${baseSlug}-${count++}`;
    params[0] = uniqueSlug;
    [existing] = await pool.query(query, params);
  }

  return uniqueSlug;
};

export const createBusiness = async (req, res) => {
  try {
    const userId = req.user.id; 
    const {
      owner_id: providedOwnerId,
      name,
      category_id,
      subcategory_id,
      pin_code,
      address,
      landmark,
      sector,
      area,
      phone,
      wp_number,
      email,
      website,
      timing,
    } = req.body;
    const owner_id = providedOwnerId || userId;
    const slug = await getUniqueSlug(name, area);
    const values = [
      owner_id ?? null,
      name ?? null,
      category_id ?? null,
      subcategory_id ?? null,
      pin_code ?? null,
      address ?? null,
      landmark ?? null,
      sector ?? null,
      area ?? null,
      phone ?? null,
      wp_number ?? null,
      email ?? null,
      website ?? null,
      JSON.stringify(timing ?? []),
      slug,
    ];

    const query = `
      INSERT INTO businesses (
        owner_id, name, category_id, subcategory_id, 
        pin_code, address, landmark, sector, area, 
        phone, wp_number, email, website, timing ,slug
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;

    const [result] = await pool.query(query, values);

    res.status(201).json({ msg: "Business created successfully", id: result.insertId });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// export const getBusinessById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [rows] = await pool.execute(
//       "SELECT * FROM businesses WHERE id = ?",
//       [id]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ msg: "Business not found" });
//     }

//     res.status(200).json(rows[0]);
//   } catch (error) {
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    // Join with users to check owner status
    const [rows] = await pool.execute(`
      SELECT b.* FROM businesses b
      JOIN users u ON b.owner_id = u.id
      WHERE b.id = ? AND u.is_active = 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Business not found or owner is inactive" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      owner_id = null,
      name = null,
      category_id = null,
      subcategory_id = null,
      pin_code = null,
      address = null,
      landmark = null,
      sector = null,
      area = null,
      phone = null,
      wp_number = null,
      email = null,
      website = null,
      timings = [],
      is_verified = false,
    } = req.body;
    
    const slug = await getUniqueSlug(name, area, id);

    const [result] = await pool.execute(
      `UPDATE businesses SET 
        owner_id = ?, 
        name = ?, 
        category_id = ?, 
        subcategory_id = ?, 
        pin_code = ?, 
        address = ?, 
        landmark = ?, 
        sector = ?, 
        area = ?, 
        phone = ?, 
        wp_number = ?, 
        email = ?, 
        website = ?, 
        timing = ?, 
        slug = ?,
        is_verified = ?
        WHERE id = ?`,
      [
        owner_id,
        name,
        category_id,
        subcategory_id,
        pin_code,
        address,
        landmark,
        sector,
        area,
        phone,
        wp_number,
        email,
        website,
        JSON.stringify(timings),
        slug,
        is_verified,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Business not found or nothing to update" });
    }

     // Get updated business
     const [updatedBusinessRows] = await pool.execute(
      `SELECT * FROM businesses WHERE id = ?`,
      [id]
    );
    const updatedBusiness = updatedBusinessRows[0];

    res.status(200).json({ msg: "Business updated successfully", slug });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ msg: "Invalid business ID" });
    }

    const [result] = await pool.execute(
      "DELETE FROM businesses WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Business not found" });
    }

    res.status(200).json({ msg: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('Received request for business with slug:', slug);

    const [rows] = await pool.query(
      "SELECT * FROM businesses WHERE slug = ? AND is_Verified = 1",
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Verified business not found" });
    }

    const business = rows[0];

    const [imageRows] = await pool.query(
      "SELECT id, image_url FROM business_images WHERE business_id = ?",
      [business.id]
    );

    const images = imageRows.map(img => ({
      id: img.id,
      url: img.image_url
    }));

    res.status(200).json({ business: { ...business, images } });
  } catch (error) {
    console.error("Error fetching business by slug:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinesses = async (req, res) => {
  try {
    console.log('Logged in user:', req.user);
    let { categoryslug, subcategoryslug, name, location, page = 1, limit = 10, isVerified = 1 } = req.query;
    console.log('Raw query:', { categoryslug, subcategoryslug, name, location, page, limit, isVerified });

    page = Math.max(1, parseInt(page)); 
    limit = Math.max(1, parseInt(limit)); 

    const offset = (page - 1) * limit;

    console.log('Page:', page);
    console.log('Limit:', limit);
    console.log('Offset:', offset);

    let isVerifiedValue = (isVerified === 'false' || isVerified === 0 || isVerified === '0') ? 0 : 1;
    let query = `SELECT * FROM businesses WHERE is_verified = ?`;
    let values = [isVerifiedValue];

    if (categoryslug) {
      query += ` AND category_id IN (SELECT id FROM category WHERE slug = ?)`;
      values.push(categoryslug);
      console.log(' categoryslug:', categoryslug);
    }

    if (subcategoryslug) {
      query += ` AND subcategory_id IN (SELECT id FROM subcategory WHERE slug = ?)`;
      values.push(subcategoryslug);
      console.log(' subcategoryslug:', subcategoryslug);
    }

    if (name) {
      query += ` AND name LIKE ?`;
      values.push(`%${name}%`);
    }

    if (location) {
      query += ` AND (address LIKE ? OR landmark LIKE ? OR sector LIKE ? OR area LIKE ?)`;
      values.push(`%${location}%`, `%${location}%`, `%${location}%`, `%${location}%`);
    }

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    console.log('Final Query for SELECT:', query);
    console.log('Final Values for SELECT:', values);

    const [rows] = await pool.execute(query, values);

    let countQuery = `SELECT COUNT(*) AS total FROM businesses WHERE is_verified = ?`;
    let countValues = [isVerified === 'false' ? 0 : 1];

    if (categoryslug) {
      countQuery += ` AND category_id IN (SELECT id FROM category WHERE slug = ?)`;
      countValues.push(categoryslug);
      console.log('categoryslug id:',categoryslug);
    }

    if (subcategoryslug) {
      countQuery += ` AND subcategory_id IN (SELECT id FROM subcategory WHERE slug = ?)`;
      countValues.push(subcategoryslug);
      console.log('subcategoryslug id:',subcategoryslug);
    }

    if (name) {
      countQuery += ` AND name LIKE ?`;
      countValues.push(`%${name}%`);
    }

    if (location) {
      countQuery += ` AND (address LIKE ? OR landmark LIKE ? OR sector LIKE ? OR area LIKE ?)`;
      countValues.push(`%${location}%`, `%${location}%`, `%${location}%`, `%${location}%`);
    }

    const [[countResult]] = await pool.execute(countQuery, countValues);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      page: page,
      limit: limit,
      total: total,
      totalPages: totalPages,
      data: rows
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// upload img for business
export const uploadPhotosForBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ msg: "No files uploaded" });
    }
    console.log('Uploaded files:', req.files);

    const savedImageUrls = [];

    for (let file of files) {
      const imageUrl = `/uploads/${file.filename}`;

      await pool.query(
        "INSERT INTO business_images (business_id, image_url, created_at) VALUES (?, ?, NOW())",
        [businessId, imageUrl]
      );

      savedImageUrls.push(imageUrl);
    }

    res.status(201).json({
      msg: "Photos uploaded successfully",
      images: savedImageUrls,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Business By UserId
export const getBusinessByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Fetching businesses for userId:", userId);

    // Step 1: Get all businesses by user
    const [businessRows] = await pool.query(
      "SELECT * FROM businesses WHERE owner_id = ?",
      [userId]
    );

    if (businessRows.length === 0) {
      return res.status(404).json({ msg: "No businesses found for this user" });
    }

    const businessIds = businessRows.map(b => b.id);

    // Step 2: Get all images related to these businesses
    const [imageRows] = await pool.query(
      "SELECT id, image_url, business_id FROM business_images WHERE business_id IN (?)",
      [businessIds]
    );

    // Step 3: Group images by business_id
    const imagesMap = {};
    imageRows.forEach(img => {
      if (!imagesMap[img.business_id]) {
        imagesMap[img.business_id] = [];
      }
      imagesMap[img.business_id].push({
        id: img.id,
        url: img.image_url,
      });
    });

    // Step 4: Attach images to each business
    const businesses = businessRows.map(b => ({
      ...b,
      images: imagesMap[b.id] || []
    }));

    res.status(200).json({ businesses });
  } catch (error) {
    console.error("Error fetching businesses by user ID:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// Delete images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const deleteImages = async (req, res) => {
  try {
    const businessId = req.params.id;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: "photoUrl is required" });
    }

    const fileName = path.basename(photoUrl);
    const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);

    // Ensure file exists before deleting
    await fs.access(filePath);
    await fs.unlink(filePath); 
    console.log("Deleted file:", filePath);

    const [rows] = await pool.query("SELECT images FROM businesses WHERE id = ?", [businessId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    const images = JSON.parse(rows[0].images || "[]");
    const updatedImages = images.filter((img) => img !== fileName);

    await pool.query("UPDATE businesses SET images = ? WHERE id = ?", [
        JSON.stringify(updatedImages),
        businessId,
      ]);

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
