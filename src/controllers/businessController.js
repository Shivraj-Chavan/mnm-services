import slugify from "slugify";
import pool from "../config/db.js";
import path from "path";
import fs from 'fs/promises'; 
import { fileURLToPath } from 'url';
import ExcelJS from "exceljs";
import { logAdminAction } from "../utils/logAdminAction.js";
import { isAdminOrSubadmin } from "../utils/checkAdmin.js";

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
  console.log("CREating business")
  try {
    const userId = req.user.id; 
    const user = req.user; 
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const{
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
      description,
      website,
      timing,
      latitude, 
      longitude,
    } = req.body;
    const owner_id = providedOwnerId || userId;
    const slug = await getUniqueSlug(name, area);

    // Ensure latitude and longitude are numbers or null
    const latValue = latitude ? parseFloat(latitude) : null;
    const lngValue = longitude ? parseFloat(longitude) : null;

    console.log( {
      latitude: latValue,
      longitude: lngValue,
    });


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
      description ?? null,
      website ?? null,
      JSON.stringify(timing ?? []),
      slug,
      latValue,
      lngValue,
    ];
    console.log("Final Data to Insert into DB:", values);

    const query = `
      INSERT INTO businesses (
        owner_id, name, category_id, subcategory_id, 
        pin_code, address, landmark, sector, area, 
        phone, wp_number, email, description,  website, timing ,slug , latitude, longitude 
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)
    `;

    const [result] = await pool.query(query, values);

    const newBusinessId = result.insertId;

    // Log admin action only if sub-admin
    if (user.role === 'sub-admin') {
      await pool.query(
        `INSERT INTO admin_actions 
         (admin_id, action, target_type, target_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, "Created business", "Business", newBusinessId, new Date()]
      );
      console.log("Admin action logged for sub-admin");
    } else {
      console.log("Super-admin action ignored in admin_actions table");
    }

    res.status(201).json({ msg: "Business created successfully", id: newBusinessId });
  } catch (error) {
    console.log("BUSINESS create error ")
    console.log(error.message)
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
    console.log("Business fetched:", rows[0]);

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; 
    const userId = req.user.id;
    const role = req.user.role;

    console.log("Business ID:", id);
    console.log("Current User ID:", userId);
    console.log("User Role:", role);
    console.log("User:", user);


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
      description=null,
      website = null,
      timing = [],
      is_verified = false,
      latitude = null,
      longitude = null,
    } = req.body;
    console.log("Request Body:", req.body);

    const slug = await getUniqueSlug(name, area, id);

      // Parse to floats for DB safety
      const latValue = latitude ? parseFloat(latitude) : null;
      const lngValue = longitude ? parseFloat(longitude) : null;

     // Admin updates directly
    // if (role === "admin") {
    
  if (isAdminOrSubadmin(user)) {
  //   return res.status(403).json({ msg: "Permission denied" });
  // }
      console.log(`${role} is updating the business directly...`);
     
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
          description = ?,
          website = ?, 
          timing = ?, 
          slug = ?,
          is_verified = ?,
          latitude = ?,
          longitude = ? 
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
          description,
          website,
          
    typeof timing === "string" ? timing : JSON.stringify(timing),
          slug,
          is_verified,
          latValue,          
          lngValue,          
          id,
        ]
      );
      console.log("Update result:", result);

      if (result.affectedRows === 0) {
        return res.status(404).json({ msg: "Business not found or nothing to update" });
      }

      // Log subadmin action
      if (user.role === "sub-admin") {
      const actionText = is_verified ? "Verified business" : "Updated business";
      await logAdminAction(userId, actionText, "Business", id);
      };

      // const recipientPhone = phone || wp_number;
      // if (recipientPhone) {
      //   try {
      //     const smsResponse = await sendSms("businessConfirmation", recipientPhone, {});
      //     console.log("SMS Response:", JSON.stringify(smsResponse, null, 2));
      //   } catch (err) {
      //     console.error("Failed to send BusinessRegistration SMS:", err.message);
      //   }
      // }

      // return res.status(200).json({ msg: "Business updated successfully by admin", slug });
      return res.status(200).json({
        msg: `Business ${is_verified ? "verified" : "updated"} successfully by ${role}`,
        slug,
      });
    } else {
      // Owner submit request for approval
      const [existing] = await pool.execute(`SELECT id FROM update_businesses WHERE id = ? AND is_verified = 0`, [id]);

      if (existing.length > 0) {
        return res.status(409).json({ msg: "An update request is already pending for this business" });
      }

      await pool.execute(
        `INSERT INTO update_businesses (
          id, owner_id, name, category_id, subcategory_id, pin_code, address,
          landmark, sector, area, phone, wp_number, email, description, website, timing, slug, latitude, longitude, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?,?)`,
        [
          id,
          userId,
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
          description,
          website,
          JSON.stringify(timing),
          slug,
          latValue,
          lngValue,
          is_verified,
        ]
      );
      console.log("Owner update inserted into update_businesses table.");
      return res.status(200).json({ msg: "Business update submitted for admin approval", slug });
    }
    
  } catch (error) {
    console.error("Update business error:", error);
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
    let { categoryslug, subcategoryslug, name,email,phone, location, page = 1, limit = 10, isVerified = 1 } = req.query;
    console.log('Raw query:', { categoryslug, subcategoryslug, name, location, page, limit, isVerified });

    page = Math.max(1, parseInt(page)); 
    limit = Math.max(1, parseInt(limit)); 

    const offset = (page - 1) * limit;

    console.log('Page:', page);
    console.log('Limit:', limit);
    console.log('Offset:', offset);

    let isVerifiedValue = (isVerified === 'false' || isVerified === 0 || isVerified === '0') ? 0 : 1;
    let query = `SELECT b.*, 
                (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url
              FROM businesses b
              WHERE b.is_verified = ?`;
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

    if (name) {
      query += ` OR email LIKE ?`;
      values.push(`%${name}%`);
    }

    if (name) {
      query += ` OR phone LIKE ?`;
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
    if (name) {
      query += ` OR email LIKE ?`;
      values.push(`%${name}%`);
    }

    if (name) {
      query += ` OR phone LIKE ?`;
      values.push(`%${name}%`);
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

// Node-to-pincode mapping
const nodePinCodes = {
  "Airoli Node": ["400708", "400701"],
  "Ghansoli Node": ["400701", "400706"],
  "Kopar Khairane Node": ["400709", "400703"],
  "Vashi – Sanpada – Turbhe": ["400703", "400705"],
  "Nerul Node": ["400706", "400705"],
  "Seawoods – CBD Belapur": ["400706", "400614"],
  "Kharghar Node": ["410210", "410208"],
  "Kamothe – Kalamboli": ["410209", "410218"],
  "Taloja Node": ["410208", "410210"],
  "Panvel Region": ["410206"],
  "Ulwe Node": ["410206"],
  "Dronagiri Node (JNPT belt)": ["400707"],  
  "Uran Town & Surrounding Villages": ["400702"]
};

export const globalSearchBusinesses = async (req, res) => {
  try {
    let { q = "", location = "", page = 1, limit = 10 } = req.query;
    q = String(q || "").trim();
    location = String(location || "").trim();
    let nodeName = "";
    if (!q) return res.status(400).json({ msg: "Search query is required" });

    page = Number.isFinite(Number(page)) ? Math.max(1, parseInt(page, 10)) : 1;
    limit = Number.isFinite(Number(limit)) ? Math.max(1, parseInt(limit, 10)) : 10;
    limit = Math.min(limit, 50);
    const offset = (page - 1) * limit;

    const nodePinCodes = {
      "Airoli Node": ["400708", "400701"],
      "Ghansoli Node": ["400701", "400706"],
      "Kopar Khairane Node": ["400709", "400703"],
      "Vashi – Sanpada – Turbhe": ["400703", "400705"],
      "Nerul Node": ["400706", "400705"],
      "Seawoods – CBD Belapur": ["400706", "400614"],
      "Kharghar Node": ["410210", "410208"],
      "Kamothe – Kalamboli": ["410209", "410218"],
      "Taloja Node": ["410208", "410210"],
      "Panvel Region": ["410206"],
      "Ulwe Node": ["410206"],
      "Dronagiri Node (JNPT belt)": ["400707"],
      "Uran Town & Surrounding Villages": ["400702"]
    };

    const tokens = Array.from(new Set(q.split(/\s+/).map(t => t.trim()).filter(Boolean)));
    const tokenLikes = tokens.map(() => "%"+q+"%");
    const nameLike = `%${q}%`;
    const areaLike = `%${q}%`;

    let matchedCategoryId = null;
    let matchedSubcategoryId = null;
    const categoryChecks = [q, ...tokens].slice(0, 6); 
    for (const text of categoryChecks) {
      const [catRows] = await pool.query(
        "SELECT id FROM category WHERE name LIKE ? LIMIT 1", [`%${text}%`]
      );
      if (catRows.length) {
        matchedCategoryId = catRows[0].id;
        break;
      }
    }
    for (const text of categoryChecks) {
      const [subRows] = await pool.query(
        "SELECT id FROM subcategory WHERE name LIKE ? LIMIT 1", [`%${text}%`]
      );
      if (subRows.length) {
        matchedSubcategoryId = subRows[0].id;
        break;
      }
    }

    let locationCondition = "";
    const locationValues = [];
    if (location) {
      if (nodePinCodes[location]) {
        const pins = nodePinCodes[location];
        const placeholders = pins.map(() => "?").join(",");
        locationCondition = ` AND b.pin_code IN (${placeholders})`;
        locationValues.push(...pins);
      } else if (/^\d{5,6}$/.test(location)) {
         // It's a pincode, check if it matches any node
    for (const [node, pins] of Object.entries(nodePinCodes)) {
      if (pins.includes(location)) {
        nodeName = node; 
        break;
      }}
        locationCondition = ` AND b.pin_code = ?`;
        locationValues.push(location);
      } else {
        nodeName = location;
        locationCondition = ` AND b.area LIKE ?`;
        locationValues.push(`%${location}%`);
      }
    }

    const whereBase = `b.is_verified = 1`;

    const useFullText = q.replace(/\s+/g, "").length >= 3;

    let selectRelevancePart = `
      ((b.category_id = ?)*10) +
      ((b.subcategory_id = ?)*9) +
      ((b.name LIKE ?)*8) +
      ((b.area LIKE ?)*4)
    `;

    let fromAndJoins = `
      FROM businesses b
      LEFT JOIN category c ON b.category_id = c.id
      LEFT JOIN subcategory sc ON b.subcategory_id = sc.id
    `;

    let mainQuery;
    let mainParams = [];
    if (useFullText) {
      selectRelevancePart += ` + (MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE))`;
      mainQuery = `
        SELECT b.*,
          (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url,
          (${selectRelevancePart}) AS relevance
        ${fromAndJoins}
        WHERE ${whereBase}
          AND MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE)
          ${locationCondition}
        ORDER BY relevance DESC, b.name ASC
        LIMIT ? OFFSET ?
      `;
      mainParams = [
        matchedCategoryId ?? 0,
        matchedSubcategoryId ?? 0,
        nameLike,
        areaLike,
        q, // fulltext score param
        q, // fulltext WHERE param
        ...locationValues,
        limit,
        offset
      ];
    } else {
      const searchConditions = [
        "b.name LIKE ?",
        "b.description LIKE ?",
        "c.name LIKE ?",
        "sc.name LIKE ?",
        "b.area LIKE ?"
      ].join(" OR ");
      mainQuery = `
        SELECT b.*,
          (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url,
          (${selectRelevancePart}) AS relevance
        ${fromAndJoins}
        WHERE ${whereBase}
          AND (${searchConditions})
          ${locationCondition}
        ORDER BY relevance DESC, b.name ASC
        LIMIT ? OFFSET ?
      `;
      mainParams = [
        matchedCategoryId ?? 0,
        matchedSubcategoryId ?? 0,
        nameLike,
        areaLike,
        nameLike,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        areaLike,
        ...locationValues,
        limit,
        offset
      ];
    }

    let dataRows;
    try {
      const [rows] = await pool.query(mainQuery, mainParams);
      dataRows = rows;
    } catch (err) {
      const searchConditions = [
        "b.name LIKE ?",
        "b.description LIKE ?",
        "c.name LIKE ?",
        "sc.name LIKE ?",
        "b.area LIKE ?"
      ].join(" OR ");
      const fallbackQuery = `
        SELECT b.*,
          (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url,
          (
            ((b.category_id = ?)*10) +
            ((b.subcategory_id = ?)*9) +
            ((b.name LIKE ?)*8) +
            ((b.area LIKE ?)*4)
          ) AS relevance
        ${fromAndJoins}
        WHERE ${whereBase}
          AND (${searchConditions})
          ${locationCondition}
        ORDER BY relevance DESC, b.name ASC
        LIMIT ? OFFSET ?
      `;
      const fallbackParams = [
        matchedCategoryId ?? 0,
        matchedSubcategoryId ?? 0,
        nameLike,
        areaLike,
        nameLike,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        areaLike,
        ...locationValues,
        limit,
        offset
      ];
      const [fallbackRows] = await pool.query(fallbackQuery, fallbackParams);
      dataRows = fallbackRows;
    }

    let countQuery;
    let countParams;
    if (useFullText) {
      countQuery = `
        SELECT COUNT(*) AS total
        ${fromAndJoins}
        WHERE ${whereBase}
          AND MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE)
          ${locationCondition}
      `;
      countParams = [q, ...locationValues];
    } else {
      countQuery = `
        SELECT COUNT(*) AS total
        ${fromAndJoins}
        WHERE ${whereBase}
          AND (
            b.name LIKE ? OR
            b.description LIKE ? OR
            c.name LIKE ? OR
            sc.name LIKE ? OR
            b.area LIKE ?
          )
          ${locationCondition}
      `;
      countParams = [
        nameLike,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        areaLike,
        ...locationValues
      ];
    }
    const [[countResult]] = await pool.query(countQuery, countParams);
    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit) || 0;

    res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      data: dataRows,
      nodeName,
    });
  } catch (error) {
    console.error("Error in global search:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// upload img for business
export const uploadPhotosForBusiness = async (req, res) => {
  console.log("Request Params:", req.params);
  try {
    const { businessId } = req.params;
    console.log('businessid',businessId);
    
    const files = req.files;

    if (!files || files.length === 0) {
      console.warn("No files received in request");
      return res.status(400).json({ msg: "No files uploaded" });
    }
    console.log(`Received ${files.length} files for business ID: ${businessId}`);

    console.log("Checking payment plan for business:", businessId);
    const [planResult] = await pool.query(
      `SELECT plan FROM payments WHERE business_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`,
      [businessId]
    );
    console.log("Payment plan query result:", planResult);

    const selectedPlan = planResult?.[0]?.plan?.toLowerCase() || 'free';
    console.log(`Plan for business ${businessId}: ${selectedPlan}`);

    // Define image limits by plan
    const planLimits = {
      free: 2,
      silver: 5,
      gold: 10,
      platinum: 20,
    };

    const maxImages = planLimits[selectedPlan] || 2;
    console.log(`Image limit for '${selectedPlan}' plan: ${maxImages}`);

    // Check how many already uploaded
    const [existingImages] = await pool.query(
      `SELECT COUNT(*) AS count FROM business_images WHERE business_id = ?`,
      [businessId]
    );
    console.log("Existing images query result:", existingImages);

    const currentCount = existingImages[0]?.count || 0;
    const newTotal = currentCount + files.length;

    console.log(`Existing images: ${currentCount}, New uploads: ${files.length}, Total: ${newTotal}, Allowed: ${maxImages}`);

    if (newTotal > maxImages) {
      console.warn(`Upload exceeds limit! Allowed: ${maxImages}, Current: ${currentCount}`);
      return res.status(400).json({
        msg: `You can upload a maximum of ${maxImages} photos for the ${selectedPlan} plan. You already have ${currentCount}.`,
      });
    }

    // File size validation
    for (const file of files) {
      console.log(`Checking size for: ${file.originalname}, Size: ${file.size} bytes`);
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          msg: `File "${file.originalname}" exceeds 5MB limit.`,
        });
      }
    }

    const savedImageUrls = [];

    for (let file of files) {
      const imageUrl = `/uploads/${file.filename}`;
      console.log(`Inserting image: ${imageUrl}`);

      await pool.query(
        "INSERT INTO business_images (business_id, image_url, created_at) VALUES (?, ?, NOW())",
        [businessId, imageUrl]
      );

      savedImageUrls.push(imageUrl);
    }
    console.log(`Successfully saved ${savedImageUrls.length} images for business ${businessId}`);
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
    console.log({"bsuinessRow":businessRows})
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

    const parts = photoUrl.split("/");
    const fileName = parts[parts.length - 1];
    const dbPath = `/uploads/${fileName}`;
    const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);

    await pool.query(
      "DELETE FROM business_images WHERE image_url = ? AND business_id = ?",
      [dbPath, businessId]
    );

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (err) {}

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Owner submits business edit
export const submitBusinessUpdate = async (req, res) => {
  const businessId = req.params.id;
  const data = req.body;
  const user = req.user;
  
  try {
    if (user.role === 'admin' || user.role === 'sub-admin') {
      return res.status(403).json({ msg: "Admins/Sub-admins must update directly" });
    }

        // Parse and validate latitude/longitude
        const latValue = data.latitude ? parseFloat(data.latitude) : null;
        const lngValue = data.longitude ? parseFloat(data.longitude) : null;
    
    await pool.query(
      `REPLACE INTO update_businesses  (id, owner_id, name, description, timing, website, address, area, landmark, sector, pin_code, phone, wp_number, category_id, subcategory_id, email, latitude, longitude, slug,is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?, ?,?)`,
      [
        businessId,
        data.owner_id,
        data.name,
        data.description,
        data.timing,
        data.website,
        data.address,
        data.area,
        data.landmark,
        data.sector,
        data.pin_code,
        data.phone,
        data.wp_number,
        data.category_id,
        data.subcategory_id,
        data.email ?? null,
        // 0, 
        latValue,
        lngValue,
        data.slug ?? null,
        data.is_verified
      ]
    ); 
    
    // await pool.query("DELETE FROM update_business_images WHERE business_id = ?", [businessId]);
    console.log("Old update images deleted for business:", businessId);

    res.json({ msg: "Update submitted for review" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to submit update" });
  }
};

// Owner uploads photos for update
export const uploadUpdatePhotos = async (req, res) => {
  const businessId = req.params.id;
  console.log('businessid',businessId)

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: "No files uploaded" });
    }

    // if (req.files.length > 2) {
    //   return res.status(400).json({ msg: "Max 2 images allowed" });
    // }

     // STEP 1: Fetch selected plan
     const [planResult] = await pool.query(
      `SELECT plan FROM payments WHERE business_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`,
      [businessId]
    );

    const selectedPlan = planResult?.[0]?.plan || "free";
    console.log(`Plan for business ${businessId}: ${selectedPlan}`);

    // STEP 2: Define limits
    const planLimits = {
      free: 2,
      silver: 5,
      gold: 10,
      platinum: 20,
    };

    const maxImages = planLimits[selectedPlan.toLowerCase()] || 2;
    console.log(`Max images allowed for '${selectedPlan}' plan: ${maxImages}`);


    // STEP 3: Validate
    if (req.files.length > maxImages) {
      console.warn(`Upload exceeds max limit (${maxImages}). Rejected.`);
      return res.status(400).json({
        msg: `Max ${maxImages} images allowed for ${selectedPlan} plan`,
      });
    }

    for (const file of req.files) {
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ msg: `File ${file.originalname} exceeds 5MB limit` });
      }
    }

     // Prepare image paths
     const photoData = req.files.map((file) => [businessId, `/uploads/${file.filename}`]);

     // Store image paths
     await pool.query(
       `INSERT INTO update_business_images (business_id, image_url) VALUES ?`, [photoData]
     );
 
     console.log("Images saved to update_business_images");
     res.json({ msg: "Images uploaded for review" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Image upload failed" });
  }
};

// Admin views pending updates
export const getPendingUpdates = async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    const offset = (page - 1) * limit;

    // 1 Get total count of pending updates
    const [[countResult]] = await pool.query(`SELECT COUNT(*) AS total FROM update_businesses`);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
  try {
    const [updates] = await pool.query(`SELECT * FROM update_businesses LIMIT ? OFFSET ?`, [limit, offset]);
    const [images] = await pool.query(`SELECT * FROM update_business_images`);

    const imagesByBusinessId = {};
    for (const img of images) {
      if (!imagesByBusinessId[img.business_id]) {
        imagesByBusinessId[img.business_id] = [];
      }
      imagesByBusinessId[img.business_id].push(img.image_url);
    }

    const updatesWithImages = updates.map(update => ({
      ...update,
      images: imagesByBusinessId[update.id] || [],
    }));

    console.log("Fetched pending updates:", updatesWithImages.length);
    res.json({page,
      limit,
      total,
      totalPages, data: updatesWithImages });
  } catch (err) {
    console.error("Failed to fetch pending updates:", err);
    res.status(500).json({ msg: "Failed to fetch pending updates" });
  }
};

// Admin approves update
export const approveUpdate = async (req, res) => {
  const id = req.params.id;
  const user = req.user;

  try {
    const [[pending]] = await pool.query(`SELECT * FROM update_businesses WHERE id = ?`, [id]);
    console.log("Fetched pending update:", pending);
    const [images] = await pool.query(`SELECT * FROM update_business_images WHERE id = ?`, [id]);
    console.log("Fetched pending images:", images);


    if (!pending) return res.status(404).json({ msg: "Pending update not found" });
     console.warn(" No pending update found for ID:", id);

      // Only allow admin or subadmin
    if (!["admin", "sub-admin"].includes(user?.role)) {
      return res.status(403).json({ msg: "Permission denied" });
    }
     
    // Update the original business in businesses with the new data.
    await pool.query(
      `UPDATE businesses SET  name=?, description=?, timing=?, website=?, phone=?, wp_number=?, address=?, area=?, landmark=?, sector=?, pin_code=?, category_id=?, subcategory_id=?, email=?, slug=?, owner_id=?, latitude=?, longitude=? 
        WHERE id=?`,
      [
        pending.name,
        pending.description,
        pending.timing,
        pending.website,
        pending.phone,
        pending.wp_number,
        pending.address,
        pending.area,
        pending.landmark,
        pending.sector,
        pending.pin_code,
        pending.category_id,
        pending.subcategory_id,
        pending.email,
        await getUniqueSlug(pending.name, pending.area, id), 
        pending.owner_id,
        pending.latitude ? parseFloat(pending.latitude) : null,
        pending.longitude ? parseFloat(pending.longitude) : null,
        id
      ]
    );
    console.log("Replacing existing business images...");

    // Delete old image
    // await pool.query(`DELETE FROM business_images WHERE business_id = ?`, [id]);
    // if (images.length > 0) {
    //   const imageData = images.map((img) => [id, img.image_url]);

    //   // Insert new approved images
    //   await pool.query(`INSERT INTO business_images (business_id, image_url) VALUES ?`, [imageData]);
    //   console.log("New images added:", images.length);
    // }else {
    //   console.log("No new images provided.");
    // }
    if (images.length > 0) {
      console.log("Replacing existing business images...");
    
      // Delete old images only if new ones are present
      // await pool.query(`DELETE FROM business_images WHERE business_id = ?`, [id]);
    
      const imageData = images.map((img) => [id, img.image_url]);
      await pool.query(`INSERT INTO business_images (business_id, image_url) VALUES ?`, [imageData]);
      console.log("New images added:", images.length);
    } else {
      console.log("No new images provided — keeping existing images.");
    }
    
    // Clean up pending update
    await pool.query(`DELETE FROM update_businesses WHERE id = ?`, [id]);
    await pool.query(`DELETE FROM update_business_images WHERE business_id = ?`, [id]);
    
    // Log action
    // const actionText = user?.role === "sub-admin" ? "Subadmin approved business update" : "Admin approved business update";
    if (user.role === 'sub-admin') {
    await pool.query(
      `INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [user.id, "Subadmin approved business update", "Business", id]
    );
  };

    res.json({ msg: "Business update approved" });
  } catch (err) {
    console.error("Error approving update:", err);
    res.status(500).json({ msg: "Approval failed" , error: err.message });
  }
};

// Admin rejects update
export const rejectUpdate = async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log("Admin rejecting update for business:", businessId);

    // 1. Fetch images linked to this business update
    const [images] = await pool.query(
      "SELECT image_url FROM update_business_images WHERE business_id = ?",
      [businessId]
    );

    // 2. Remove images from filesystem
    for (const img of images) {
      const parts = img.image_url.split("/");
      const fileName = parts[parts.length - 1];
      const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);

      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(` Deleted file: ${filePath}`);
      } catch (err) {
        console.warn(` Could not delete file: ${filePath} (${err.message})`);
      }
    }

    // 3. Delete records from DB
    await pool.query("DELETE FROM update_business_images WHERE business_id = ?", [businessId]);
    await pool.query("DELETE FROM update_businesses WHERE id = ?", [businessId]);

    // log action
    await pool.query(
      "INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, "Rejected business update", "Business", businessId]
    );

    res.json({ msg: "Update rejected and all images removed" });
  } catch (err) {
    console.error("Reject update failed:", err);
    res.status(500).json({ error: "Rejection failed", details: err.message });
  }
};

// subadmin tracking
export const getAdminActions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const offset = (page - 1) * limit;

    // Base WHERE
    let whereClauses = ["1=1"];
    const params = [];

    if (search) {
      whereClauses.push(`(
        aa.action LIKE ? OR
        aa.target_type LIKE ? OR
        aa.target_id LIKE ? OR
        u.name LIKE ?
      )`);
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    if (startDate && endDate) {
      whereClauses.push(`aa.created_at BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    const whereSQL = whereClauses.join(" AND ");

    // Fetch actions
    const [actions] = await pool.query(
      `
      SELECT 
        aa.id,
        aa.admin_id,
        u.name AS admin_name,
        aa.action,
        aa.target_type,
        aa.target_id,
        aa.created_at
      FROM admin_actions aa
      LEFT JOIN users u ON u.id = aa.admin_id
      WHERE ${whereSQL}
      ORDER BY aa.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Count total
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM admin_actions aa
       LEFT JOIN users u ON u.id = aa.admin_id
       WHERE ${whereSQL}`,
      params
    );

    const totalPages = Math.ceil(countResult[0].total / limit);

    res.json({
      actions,
      totalPages,
      totalCount: countResult[0].total,
    });
  } catch (err) {
    console.error("Error fetching admin actions:", err);
    res.status(500).json({ message: "Error fetching admin actions", error: err.message });
  }
};

export const getBusinessImages = async (req, res) => {
  try {
    const { id } = req.params;

    const [images] = await pool.query(
      "SELECT id, image_url FROM business_images WHERE business_id = ?",
      [id]
    );

    res.status(200).json({ images });
  } catch (err) {
    console.error("Error fetching images:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// for dashboard
export const exportBusinesses = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start and end dates are required." });
    }

    const query = `
      SELECT 
        b.id,
        b.name AS business_name,
        c.name AS category_name,
        sc.name AS subcategory_name,
        b.phone,
        b.wp_number,
        b.email,
        b.address,
        b.landmark,
        b.area,
        b.sector,
        b.pin_code,
        b.description,
        b.website,
        b.is_verified,
        b.latitude,
        b.longitude,
        b.created_at
      FROM businesses b
      LEFT JOIN category c ON b.category_id = c.id
      LEFT JOIN subcategory sc ON b.subcategory_id = sc.id
      WHERE DATE(b.created_at) BETWEEN ? AND ?
      ORDER BY c.name ASC, sc.name ASC, b.name ASC
    `;

    const [rows] = await pool.query(query, [startDate, endDate]);
    if (!rows.length) {
      return res.status(404).json({ message: "No data found." });
    }

    // --- Create workbook in memory ---
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Businesses");

    sheet.columns = [
      { header: "ID", key: "id", width: 6 },
      { header: "Business Name", key: "business_name", width: 30 },
      { header: "Category", key: "category_name", width: 20 },
      { header: "Subcategory", key: "subcategory_name", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "WhatsApp", key: "wp_number", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Address", key: "address", width: 30 },
      { header: "Area", key: "area", width: 15 },
      { header: "Sector", key: "sector", width: 10 },
      { header: "Pincode", key: "pin_code", width: 10 },
      { header: "Website", key: "website", width: 25 },
      { header: "Description", key: "description", width: 40 },
      { header: "Verified", key: "is_verified", width: 10 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        ...r,
        is_verified: r.is_verified ? "Yes" : "No",
        created_at: new Date(r.created_at).toLocaleString(),
      });
    });

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="businesses_${startDate}_to_${endDate}.xlsx"`
    );

    const buffer = await workbook.xlsx.writeBuffer();

    res.status(200).send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    if (!res.headersSent)
      res.status(500).json({ message: "Failed to export", error: error.message });
  }
};

// download admin actions
export const exportAdminActions = async (req, res) => {
  try {
    const { startDate, endDate, adminName, fields } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start and end dates are required." });
    }

    // --- Main query with JOINs ---
    let query = `
      SELECT 
        aa.id,
        u.name AS admin_name,
        aa.action,
        b.name AS business_name,
        b.address AS business_location,
        b.phone AS business_phone,
        aa.created_at
      FROM admin_actions aa
      LEFT JOIN users u ON u.id = aa.admin_id
      LEFT JOIN businesses b ON b.id = aa.target_id
      WHERE DATE(aa.created_at) BETWEEN ? AND ?
    `;

    const queryParams = [startDate, endDate];

    // --- Filter by admin name if provided ---
    if (adminName) {
      query += " AND u.name LIKE ?";
      queryParams.push(`%${adminName}%`);
    }

    query += " ORDER BY aa.created_at DESC";

    const [rows] = await pool.query(query, queryParams);

    if (!rows.length)
      return res.status(404).json({ message: "No data found." });

    // --- Define Excel columns ---
    const sheetColumns = fields
      ? fields.split(",").map(f => ({ key: f, header: f, width: 20 }))
      : [
          { header: "ID", key: "id", width: 6 },
          { header: "Admin Name", key: "admin_name", width: 25 },
          { header: "Action", key: "action", width: 30 },
          { header: "Business Name", key: "business_name", width: 25 },
          { header: "Business Location", key: "business_location", width: 30 },
          { header: "Business Phone", key: "business_phone", width: 20 },
          { header: "Created At", key: "created_at", width: 25 },
        ];

    // --- Create workbook ---
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Admin Actions");
    sheet.columns = sheetColumns;

    // --- Add data rows ---
    rows.forEach(r => {
      const rowData = {};
      sheetColumns.forEach(col => {
        rowData[col.key] =
          col.key === "created_at"
            ? new Date(r[col.key]).toLocaleString()
            : r[col.key] ?? "-";
      });
      sheet.addRow(rowData);
    });

    // --- Header style ---
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // --- Auto-fit row height ---
    sheet.eachRow({ includeEmpty: false }, row => {
      row.height = 22;
    });

    // --- Send Excel ---
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admin_actions_${startDate}_to_${endDate}.xlsx"`
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Export Admin Actions Error:", error);
    if (!res.headersSent)
      res.status(500).json({
        message: "Failed to export admin actions",
        error: error.message,
      });
  }
};