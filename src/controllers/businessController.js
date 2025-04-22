import pool from "../config/db.js";

export const createBusiness = async (req, res) => {
  try {
    const {
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
      timing,
    } = req.body;

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
      JSON.stringify(timing ?? []), // Assuming timing is an object or array
    ];

    const query = `
      INSERT INTO businesses (
        owner_id, name, category_id, subcategory_id, 
        pin_code, address, landmark, sector, area, 
        phone, wp_number, email, website, timing
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, values);

    res.status(201).json({ msg: "Business created successfully", id: result.insertId });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      "SELECT * FROM businesses WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Business not found" });
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
      owner_id,
      name,
      category_id,
      subcategory_id,
      pincode,
      address,
      landmark,
      sector,
      area,
      phone,
      wp_number,
      email,
      website,
      timings, // JSON object
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE businesses SET 
        owner_id = ?, 
        name = ?, 
        category_id = ?, 
        subcategory_id = ?, 
        pincode = ?, 
        address = ?, 
        landmark = ?, 
        sector = ?, 
        area = ?, 
        phone = ?, 
        wp_number = ?, 
        email = ?, 
        website = ?, 
        timings = ?
      WHERE id = ?`,
      [
        owner_id,
        name,
        category_id,
        subcategory_id,
        pincode,
        address,
        landmark,
        sector,
        area,
        phone,
        wp_number,
        email,
        website,
        JSON.stringify(timings),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Business not found or nothing to update" });
    }

    res.status(200).json({ msg: "Business updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

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

export const getBusinesses = async (req, res) => {
  try {
    const { category_id, subcategory_id } = req.query;

    let query = `SELECT * FROM businesses`;
    const conditions = [];
    const values = [];

    if (category_id) {
      conditions.push("category_id = ?");
      values.push(category_id);
    }

    if (subcategory_id) {
      conditions.push("subcategory_id = ?");
      values.push(subcategory_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
      query += ` ORDER BY RAND()`;
    } else {
      query += ` ORDER BY id DESC`; 
    }

    const [rows] = await pool.execute(query, values);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
