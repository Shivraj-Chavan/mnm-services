import pool from "../config/db.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [users] = await pool.query("SELECT COUNT(*) AS count FROM users");
    // console.log("users", JSON.stringify(users, null, 2));

    const [verifiedBusinesses] = await pool.query("SELECT COUNT(*) AS count FROM businesses WHERE is_verified = 1");
    // console.log("verifiedBusinesses", JSON.stringify(verifiedBusinesses, null, 2));

    const [pendingVerifications] = await pool.query("SELECT COUNT(*) AS count FROM businesses WHERE is_verified = 0");
    // console.log("pendingVerifications", JSON.stringify(pendingVerifications, null, 2));

    const [pendingUpdates] = await pool.query("SELECT COUNT(*) AS count FROM update_businesses WHERE is_verified = 0");
    // console.log("pendingUpdates", JSON.stringify(pendingUpdates, null, 2));

    const [contacts] = await pool.query("SELECT COUNT(*) AS count FROM contact_us");
    // console.log("contacts", JSON.stringify(contacts, null, 2));

    const [reviewDelete] = await pool.query("SELECT COUNT(*) AS count FROM reviews where delete_query=1");
    // console.log("reviewDelete", JSON.stringify(reviewDelete, null, 2));

    const [enquiries] = await pool.query("SELECT COUNT(*) AS count FROM enquiries");
    // console.log("enquiries", JSON.stringify(enquiries, null, 2));
    const [unviewedContacts] = await pool.query(
      "SELECT COUNT(*) AS count FROM contact_us WHERE viewed = 0"
    );
    // console.log("unviewedContacts", JSON.stringify(unviewedContacts, null, 2));

    return res.status(200).json({
      totalUsers: users[0].count,
      verifiedBusinesses: verifiedBusinesses[0].count,
      pendingVerifications: pendingVerifications[0].count,
      pendingUpdates: pendingUpdates[0].count,
      contactMessages: contacts[0].count,
      reviewDeleteRequests: reviewDelete[0].count,
      businessEnquiries: enquiries[0].count,
      unviewedContacts: unviewedContacts[0].count,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// Subadmin tracking Stats
export const getDailySubadminStats = async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT u.id AS admin_id, u.name AS admin_name,
              SUM(CASE WHEN a.action = 'Approved business update' THEN 1 ELSE 0 END) AS approved_businesses,
              SUM(CASE WHEN a.action = 'Registered user' THEN 1 ELSE 0 END) AS registered_users
       FROM admin_actions a
       JOIN users u ON u.id = a.admin_id
       WHERE u.role = 'subadmin'
         AND DATE(a.created_at) = CURDATE()
       GROUP BY u.id, u.name
       ORDER BY approved_businesses DESC`
    );

    res.json({ subadminStats: results || [] });
  } catch (err) {
    console.error("Error fetching daily subadmin stats:", err);
    res.status(500).json({ message: "Error fetching subadmin stats", error: err.message });
  }
};

