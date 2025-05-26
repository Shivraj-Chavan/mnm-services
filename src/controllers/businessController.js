import slugify from "slugify";
import pool from "../config/db.js";

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

    const [rows] = await pool.query(
      "SELECT * FROM businesses WHERE slug = ? AND is_Verified = 1",
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Verified business not found" });
    }

    res.status(200).json({ business: rows[0] });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinesses = async (req, res) => {
  try {
    let { categoryslug, subcategoryslug, name, location, page = 1, limit = 10, isVerified = 1 } = req.query;

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
    }

    if (subcategoryslug) {
      query += ` AND subcategory_id IN (SELECT id FROM subcategory WHERE slug = ?)`;
      values.push(subcategoryslug);
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
    }

    if (subcategoryslug) {
      countQuery += ` AND subcategory_id IN (SELECT id FROM subcategory WHERE slug = ?)`;
      countValues.push(subcategoryslug);
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
    const { user_id, images, created_at } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ msg: "No images provided" });
    }

    const uploadDir = path.join("uploads", "business_photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savedImageUrls = [];

    for (let base64String of images) {
      const match = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) continue;

      const ext = match[1].split("/")[1];
      const buffer = Buffer.from(match[2], "base64");
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, buffer);
      const imageUrl = `/uploads/business_photos/${fileName}`;

      // Save to DB
      await pool.query(
        "INSERT INTO business_photos (user_id, business_id, image_url, created_at) VALUES (?, ?, ?, NOW())",
        [user_id, businessId, imageUrl, created_at]
      );

      savedImageUrls.push(imageUrl);
    }

    res.status(201).json({
      msg: "Photos uploaded successfully",
      images: savedImageUrls,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
