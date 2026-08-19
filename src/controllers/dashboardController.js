import pool from "../config/db.js";

// export const getDashboardStats = async (req, res) => {
//   try {
//     const [users] = await pool.query("SELECT COUNT(*) AS count FROM users");
//     // console.log("users", JSON.stringify(users, null, 2));

//     const [verifiedBusinesses] = await pool.query("SELECT COUNT(*) AS count FROM businesses WHERE is_verified = 1");
//     // console.log("verifiedBusinesses", JSON.stringify(verifiedBusinesses, null, 2));

//     const [pendingVerifications] = await pool.query("SELECT COUNT(*) AS count FROM businesses WHERE is_verified = 0");
//     // console.log("pendingVerifications", JSON.stringify(pendingVerifications, null, 2));

//     const [pendingUpdates] = await pool.query("SELECT COUNT(*) AS count FROM update_businesses WHERE is_verified = 0");
//     // console.log("pendingUpdates", JSON.stringify(pendingUpdates, null, 2));

//     const [contacts] = await pool.query("SELECT COUNT(*) AS count FROM contact_us");
//     // console.log("contacts", JSON.stringify(contacts, null, 2));

//     const [reviewDelete] = await pool.query("SELECT COUNT(*) AS count FROM reviews where delete_query=1");
//     // console.log("reviewDelete", JSON.stringify(reviewDelete, null, 2));

//     const [enquiries] = await pool.query("SELECT COUNT(*) AS count FROM enquiries");
//     // console.log("enquiries", JSON.stringify(enquiries, null, 2));
//     const [unviewedContacts] = await pool.query(
//       "SELECT COUNT(*) AS count FROM contact_us WHERE viewed = 0"
//     );
//     // console.log("unviewedContacts", JSON.stringify(unviewedContacts, null, 2));

//     const [totalBusinesses] = await pool.query(`
//       SELECT COUNT(*) AS count
//       FROM businesses
//     `);

//     const [todayBusinesses] = await pool.query(`
//       SELECT COUNT(*) AS count
//       FROM businesses
//       WHERE DATE(created_at)=CURDATE()
//     `);

//     const [subAdmins] = await pool.query(`
//       SELECT COUNT(*) AS count
//       FROM users
//       WHERE role='subadmin'
//     `);

//     const [dailyBusinessStats] = await pool.query(`
//       SELECT
//         DATE(created_at) AS date,
//         COUNT(*) AS count
//       FROM businesses
//       GROUP BY DATE(created_at)
//       ORDER BY date DESC
//       LIMIT 30
//     `);

//     return res.status(200).json({
//       totalUsers: users[0].count,
//       verifiedBusinesses: verifiedBusinesses[0].count,
//       pendingVerifications: pendingVerifications[0].count,
//       pendingUpdates: pendingUpdates[0].count,
//       contactMessages: contacts[0].count,
//       reviewDeleteRequests: reviewDelete[0].count,
//       businessEnquiries: enquiries[0].count,
//       unviewedContacts: unviewedContacts[0].count,

//       totalBusinesses: totalBusinesses[0].count,
//       todayBusinesses: todayBusinesses[0].count,
//       subAdmins: subAdmins[0].count,
//       dailyBusinessStats,
//     });
//   } catch (err) {
//     console.error("Dashboard stats error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// }

// Subadmin tracking Stats



export const getDashboardStats = async (req, res) => {
  try {
    // Existing Queries
    const [users] = await pool.query(
      "SELECT COUNT(*) AS count FROM users"
    );

    const [verifiedBusinesses] = await pool.query(
      "SELECT COUNT(*) AS count FROM businesses WHERE is_verified = 1"
    );

    const [pendingVerifications] = await pool.query(
      "SELECT COUNT(*) AS count FROM businesses WHERE is_verified = 0"
    );

    const [pendingUpdates] = await pool.query(
      "SELECT COUNT(*) AS count FROM update_businesses WHERE is_verified = 0"
    );

    const [contacts] = await pool.query(
      "SELECT COUNT(*) AS count FROM contact_us"
    );

    const [reviewDelete] = await pool.query(
      "SELECT COUNT(*) AS count FROM reviews WHERE delete_query = 1"
    );

    const [enquiries] = await pool.query(
      "SELECT COUNT(*) AS count FROM enquiries"
    );

    const [unviewedContacts] = await pool.query(
      "SELECT COUNT(*) AS count FROM contact_us WHERE viewed = 0"
    );

    const [totalBusinesses] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM businesses
    `);

    const [todayBusinesses] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM businesses
      WHERE DATE(created_at) = CURDATE()
    `);

    const [subAdmins] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'subadmin'
    `);

    const [dailyBusinessStats] = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM businesses
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    // -----------------------------
    // NEW QUERIES (Added Only)
    // -----------------------------

    // Today's Users
    const [todayUsers] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE DATE(created_at) = CURDATE()
    `);

    // Monthly Users
    const [monthlyUsers] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE MONTH(created_at) = MONTH(CURDATE())
      AND YEAR(created_at) = YEAR(CURDATE())
    `);

    // Monthly Businesses
    const [monthlyBusinesses] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM businesses
      WHERE MONTH(created_at) = MONTH(CURDATE())
      AND YEAR(created_at) = YEAR(CURDATE())
    `);

    // Daily User Stats (Last 30 Days)
    const [dailyUserStats] = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM users
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    return res.status(200).json({
      // Existing Response
      totalUsers: users[0].count,
      verifiedBusinesses: verifiedBusinesses[0].count,
      pendingVerifications: pendingVerifications[0].count,
      pendingUpdates: pendingUpdates[0].count,
      contactMessages: contacts[0].count,
      reviewDeleteRequests: reviewDelete[0].count,
      businessEnquiries: enquiries[0].count,
      unviewedContacts: unviewedContacts[0].count,

      totalBusinesses: totalBusinesses[0].count,
      todayBusinesses: todayBusinesses[0].count,
      subAdmins: subAdmins[0].count,
      dailyBusinessStats,

      // New Response
      todayUsers: todayUsers[0].count,
      monthlyUsers: monthlyUsers[0].count,
      monthlyBusinesses: monthlyBusinesses[0].count,
      dailyUserStats,
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({
      error: "Server error",
    });
  }
};


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


// export const getAdminStats = async (req, res) => {
//   try {
//     const { admin_id } = req.query;

//     const [[todayCreatedBusinesses]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count
//       FROM admin_actions
//       WHERE admin_id = ?
//       AND action = 'Created business'
//       AND DATE(created_at) = CURDATE()
//       `,
//       [admin_id]
//     );

//     const [[totalCreatedBusinesses]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count
//       FROM admin_actions
//       WHERE admin_id = ?
//       AND action = 'Created business'
//       `,
//       [admin_id]
//     );

//     console.log("admin_id", admin_id);

//     const [[todayCreatedUsers]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count
//       FROM admin_actions
//       WHERE admin_id = ?
//       AND action IN ('Created user','Created New User')
//       AND DATE(created_at) = CURDATE()
//       `,
//       [admin_id]
//     );

//     const [[totalCreatedUsers]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count
//       FROM admin_actions
//       WHERE admin_id = ?
//       AND action IN ('Created user','Created New User')
//       `,
//       [admin_id]
//     );

//     res.json({
//       totalCreatedBusinesses: totalCreatedBusinesses.count,
//       todayCreatedBusinesses: todayCreatedBusinesses.count,
//       totalCreatedUsers: totalCreatedUsers.count,
//       todayCreatedUsers: todayCreatedUsers.count,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };






export const getAdminStats = async (req, res) => {
  try {
    console.log({ "req.query": req.query })
    console.log({ "req.user.id": req.user.id })
    const admin_id = req?.query?.admin_id || req?.user.id;
    const role = req?.user?.role;
    console.log("req.user.role",req.user.role)
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    const hasMonthYear =
      !isNaN(month) &&
      !isNaN(year) &&
      month >= 1 &&
      month <= 12;

    // if (!admin_id) {
    //   return res.status(400).json({
    //     message: "admin_id is required",
    //   });
    // }

    // If admin_id is NOT provided, return stats for all sub-admins

    // If admin_id is NOT provided, return stats for ALL admins
    if (role === "admin" && !req.query.admin_id) {
      const currentMonth = hasMonthYear
        ? month
        : new Date().getMonth() + 1;
    
      const currentYear = hasMonthYear
        ? year
        : new Date().getFullYear();

  // ============================
  // USERS
  // ============================

  const [[totalCreatedUsers]] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM admin_actions
    WHERE action IN ('Created user', 'Created New User')
  `);

  const [[todayCreatedUsers]] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM admin_actions
    WHERE action IN ('Created user', 'Created New User')
    AND DATE(created_at) = CURDATE()
  `);

  const [[monthlyCreatedUsers]] = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM admin_actions
    WHERE action IN ('Created user', 'Created New User')
    AND MONTH(created_at) = ?
    AND YEAR(created_at) = ?
    `,
    [currentMonth, currentYear]
  );

  const [dailyUserStats] = await pool.query(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM admin_actions
    WHERE action IN ('Created user', 'Created New User')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);


  // ============================
  // BUSINESSES
  // ============================

  const [[totalCreatedBusinesses]] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM admin_actions
    WHERE action = 'Created business'
  `);

  const [[todayCreatedBusinesses]] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM admin_actions
    WHERE action = 'Created business'
    AND DATE(created_at) = CURDATE()
  `);

  const [[monthlyCreatedBusinesses]] = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM admin_actions
    WHERE action = 'Created business'
    AND MONTH(created_at) = ?
    AND YEAR(created_at) = ?
    `,
    [currentMonth, currentYear]
  );

  const [dailyBusinessStats] = await pool.query(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM admin_actions
    WHERE action = 'Created business'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);


  // ============================
  // SAME RESPONSE FORMAT
  // ============================

  return res.json({
    totalUsers: totalCreatedUsers.count,
    todayUsers: todayCreatedUsers.count,
    monthlyUsers: monthlyCreatedUsers.count,

    totalBusinesses: totalCreatedBusinesses.count,
    todayBusinesses: todayCreatedBusinesses.count,
    monthlyBusinesses: monthlyCreatedBusinesses.count,

    dailyUserStats,
    dailyBusinessStats,
  });
}

    // ============================
    // USERS
    // ============================

    const [[totalCreatedUsers]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action IN ('Created user','Created New User')
      `,
      [admin_id]
    );

    const [[todayCreatedUsers]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action IN ('Created user','Created New User')
      AND DATE(created_at)=CURDATE()
      `,
      [admin_id]
    );

    const [[monthlyCreatedUsers]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action IN ('Created user','Created New User')
      AND MONTH(created_at)=?
      AND YEAR(created_at)=?
      `,
      [
        admin_id,
        hasMonthYear ? month : new Date().getMonth() + 1,
        hasMonthYear ? year : new Date().getFullYear(),
      ]
    );

    const [dailyUserStats] = await pool.query(
      `
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action IN ('Created user','Created New User')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      [admin_id]
    );

    // ============================
    // BUSINESSES
    // ============================

    const [[totalCreatedBusinesses]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action = 'Created business'
      `,
      [admin_id]
    );

    const [[todayCreatedBusinesses]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action = 'Created business'
      AND DATE(created_at)=CURDATE()
      `,
      [admin_id]
    );

    const [[monthlyCreatedBusinesses]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action = 'Created business'
      AND MONTH(created_at)=?
      AND YEAR(created_at)=?
      `,
      [
        admin_id,
        hasMonthYear ? month : new Date().getMonth() + 1,
        hasMonthYear ? year : new Date().getFullYear(),
      ]
    );

    const [dailyBusinessStats] = await pool.query(
      `
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM admin_actions
      WHERE admin_id = ?
      AND action = 'Created business'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      [admin_id]
    );

    return res.json({
      totalUsers: totalCreatedUsers.count,
      todayUsers: todayCreatedUsers.count,
      monthlyUsers: monthlyCreatedUsers.count,

      totalBusinesses: totalCreatedBusinesses.count,
      todayBusinesses: todayCreatedBusinesses.count,
      monthlyBusinesses: monthlyCreatedBusinesses.count,

      dailyUserStats,
      dailyBusinessStats,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};



export const getAdminDashboardStats = async (req, res) => {
  try {
    const { adminId, month, year } = req.query;

    const selectedMonth = Number(month) || new Date().getMonth() + 1;
    const selectedYear = Number(year) || new Date().getFullYear();

    // ==========================
    // Admin / Sub-Admin Dashboard
    // ==========================
    if (adminId) {
      const [
        [todayBusinesses],
        [totalBusinesses],
        [monthlyBusinesses],
        [todayUsers],
        [totalUsers],
        [monthlyUsers],
      ] = await Promise.all([
        // Today's Businesses
        pool.query(
          `
          SELECT COUNT(*) AS count
          FROM businesses
          WHERE created_by = ?
          AND DATE(created_at) = CURDATE()
          `,
          [adminId]
        ),

        // Total Businesses
        pool.query(
          `
          SELECT COUNT(*) AS count
          FROM businesses
          WHERE created_by = ?
          `,
          [adminId]
        ),

        // Monthly Businesses
        pool.query(
          `
          SELECT COUNT(*) AS count
          FROM businesses
          WHERE created_by = ?
          AND MONTH(created_at) = ?
          AND YEAR(created_at) = ?
          `,
          [adminId, selectedMonth, selectedYear]
        ),

        // Today's Users
        pool.query(
          `
          SELECT COUNT(*) AS count
          FROM users
          WHERE created_by = ?
          AND DATE(created_at) = CURDATE()
          `,
          [adminId]
        ),

        // Total Users
        pool.query(
          `
          SELECT COUNT(*) AS count
          FROM users
          WHERE created_by = ?
          `,
          [adminId]
        ),

        // Monthly Users
        pool.query(
          `
          SELECT COUNT(*) AS count
          FROM users
          WHERE created_by = ?
          AND MONTH(created_at) = ?
          AND YEAR(created_at) = ?
          `,
          [adminId, selectedMonth, selectedYear]
        ),
      ]);

      return res.json({
        success: true,
        stats: {
          todayBusinesses: todayBusinesses[0]?.count || 0,
          totalBusinesses: totalBusinesses[0]?.count || 0,
          monthlyBusinesses: monthlyBusinesses[0]?.count || 0,

          todayUsers: todayUsers[0]?.count || 0,
          totalUsers: totalUsers[0]?.count || 0,
          monthlyUsers: monthlyUsers[0]?.count || 0,
        },
      });
    }

    // ==========================
    // Super Admin Dashboard
    // ==========================
    const [
      [todayBusinesses],
      [totalBusinesses],
      [monthlyBusinesses],
      [todayUsers],
      [totalUsers],
      [monthlyUsers],
      [enquiries],
    ] = await Promise.all([
      // Today's Businesses
      pool.query(`
        SELECT COUNT(*) AS count
        FROM businesses
        WHERE DATE(created_at) = CURDATE()
      `),

      // Total Businesses
      pool.query(`
        SELECT COUNT(*) AS count
        FROM businesses
      `),

      // Monthly Businesses (Selected Month)
      pool.query(
        `
        SELECT COUNT(*) AS count
        FROM businesses
        WHERE MONTH(created_at) = ?
        AND YEAR(created_at) = ?
        `,
        [selectedMonth, selectedYear]
      ),

      // Today's Users
      pool.query(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE DATE(created_at) = CURDATE()
      `),

      // Total Users
      pool.query(`
        SELECT COUNT(*) AS count
        FROM users
      `),

      // Monthly Users (Selected Month)
      pool.query(
        `
        SELECT COUNT(*) AS count
        FROM users
        WHERE MONTH(created_at) = ?
        AND YEAR(created_at) = ?
        `,
        [selectedMonth, selectedYear]
      ),

      // Total Enquiries
      pool.query(`
        SELECT COUNT(*) AS count
        FROM enquiries
      `),
    ]);

    return res.json({
      success: true,
      stats: {
        todayBusinesses: todayBusinesses[0]?.count || 0,
        totalBusinesses: totalBusinesses[0]?.count || 0,
        monthlyBusinesses: monthlyBusinesses[0]?.count || 0,

        todayUsers: todayUsers[0]?.count || 0,
        totalUsers: totalUsers[0]?.count || 0,
        monthlyUsers: monthlyUsers[0]?.count || 0,

        totalEnquiries: enquiries[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};