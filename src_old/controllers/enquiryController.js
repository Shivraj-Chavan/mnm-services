import pool from "../config/db.js";

// Create a new enquiry
export const submitEnquiry = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { businessId, message } = req.body;

    if (!userId || !businessId || !message) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const createdAt = new Date();
    const query = `
      INSERT INTO enquiries (user_id, business_id, message, created_at)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [userId, businessId, message, createdAt]);

    res.status(201).json({
      msg: 'Enquiry submitted successfully',
      enquiry: {
        id: result.insertId,
        user_id: userId,
        business_id: businessId,
        message,
        created_at: createdAt,
      },
    });
  } catch (error) {
    console.error('Submit Enquiry Error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all enquiries for all businesses owned by logged-in user
export const getAllEnquiriesForOwner = async (req, res) => {
  try {
    const ownerId = req.user?.id;

    if (!ownerId) return res.status(401).json({ msg: 'Unauthorized' });

    const query = `
      SELECT
        b.id AS business_id,
        b.name AS business_name,
        e.id AS enquiry_id,
        e.message,
        e.created_at,
        u.username,
        u.email
      FROM businesses b
      JOIN enquiries e ON e.business_id = b.id
      JOIN users u ON e.user_id = u.id
      WHERE b.owner_id = ?
      ORDER BY b.name ASC, e.created_at DESC
    `;

    const [rows] = await pool.query(query, [ownerId]);

    // Group enquiries by business
    const grouped = {};
    rows.forEach(row => {
      const { business_id, business_name, ...enquiry } = row;
      if (!grouped[business_id]) {
        grouped[business_id] = {
          name: business_name,
          enquiries: [],
        };
      }
      grouped[business_id].enquiries.push({
        id: enquiry.enquiry_id,
        message: enquiry.message,
        created_at: enquiry.created_at,
        username: enquiry.username,
        email: enquiry.email,
      });
    });

    res.json(grouped);
  } catch (error) {
    console.error('Get Enquiries Error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get a single enquiry by ID
// export const getSingleEnquiry = async (req, res) => {
//   try {
//     const enquiryId = req.params.id;

//     const query = `
//       SELECT e.id, e.message, e.created_at, u.username, u.email, b.name AS business_name
//       FROM enquiries e
//       JOIN users u ON e.user_id = u.id
//       JOIN businesses b ON e.business_id = b.id
//       WHERE e.id = ?
//     `;

//     const [rows] = await pool.query(query, [enquiryId]);

//     if (rows.length === 0) {
//       return res.status(404).json({ msg: 'Enquiry not found' });
//     }

//     res.json(rows[0]);
//   } catch (error) {
//     console.error('Get Single Enquiry Error:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };

// Update enquiry (only by sender)
// export const updateEnquiry = async (req, res) => {
//   try {
//     const enquiryId = req.params.id;
//     const userId = req.user?.id;
//     const { message } = req.body;

//     if (!message) return res.status(400).json({ msg: 'Message is required' });

//     const query = `
//       UPDATE enquiries
//       SET message = ?
//       WHERE id = ? AND user_id = ?
//     `;

//     const [result] = await pool.query(query, [message, enquiryId, userId]);

//     if (result.affectedRows === 0) {
//       return res.status(403).json({ msg: 'Not allowed to update this enquiry or enquiry not found' });
//     }

//     res.json({ msg: 'Enquiry updated successfully' });
//   } catch (error) {
//     console.error('Update Enquiry Error:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };

// Delete enquiry (by sender or business owner)
// export const deleteEnquiry = async (req, res) => {
//   try {
//     const enquiryId = req.params.id;
//     const userId = req.user?.id;

//     const query = `
//       DELETE e FROM enquiries e
//       LEFT JOIN businesses b ON e.business_id = b.id
//       WHERE e.id = ? AND (e.user_id = ? OR b.owner_id = ?)
//     `;

//     const [result] = await pool.query(query, [enquiryId, userId, userId]);

//     if (result.affectedRows === 0) {
//       return res.status(403).json({ msg: 'Not authorized to delete or enquiry not found' });
//     }

//     res.json({ msg: 'Enquiry deleted successfully' });
//   } catch (error) {
//     console.error('Delete Enquiry Error:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };
