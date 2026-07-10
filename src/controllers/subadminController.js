import pool from "../config/db.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import ExcelJS from "exceljs";


export const getAllSubadmins = async (req, res) => {
    console.log("Controller: getAllSubadmins called");
    try {
      let { page = 1, limit = 10, search = "", is_blocked } = req.query;
      
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      const offset = (page - 1) * limit;
  
      let baseQuery = `
      SELECT
        users.*,
        CASE
          WHEN is_active = 1 THEN 0
          ELSE 1
        END AS is_blocked
      FROM users
      WHERE role='sub-admin'
    `;
          const params = [];
  
      // Search filter
      if (search) {
        baseQuery += " AND (name LIKE ? OR phone LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
  
      // Blocked filter
      if (typeof is_blocked !== "undefined") {
        baseQuery += " AND is_blocked = ?";
        params.push(Number(is_blocked));
      }
  
      if(req.user.role == "sub-admin"){
        baseQuery += " AND created_by = ?";
        params.push(req.user.id);
      }
  
      // Sort AFTER filters
      baseQuery += " ORDER BY created_at DESC";
  
      // Pagination
      baseQuery += ` LIMIT ${limit} OFFSET ${offset}`;
  
      console.log("Final Query:", baseQuery);
      console.log("Query Params:", params);
  
      const [rows] = await pool.execute(baseQuery, params);
  
      // Count Query (NO ORDER BY here)
      let countQuery = "SELECT COUNT(*) as total FROM users WHERE role ='sub-admin'";
      const countParams = [];
  
      if (search) {
        countQuery += " AND (name LIKE ? OR phone LIKE ?)";
        countParams.push(`%${search}%`, `%${search}%`);
      }
       
      if(req.user.role == "sub-admin"){
        countQuery += " AND created_by = ?";
        countParams.push(req.user.id);
      }
  
      if (typeof is_blocked !== "undefined") {
        countQuery += " AND is_blocked = ?";
        countParams.push(Number(is_blocked));
      }
  
      const [countResult] = await pool.execute(countQuery, countParams);
  
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
  
      return res.json({
        data: rows,
        pagination: {
          total,
          page,
          totalPages,
          limit,
        },
      });
  
    } catch (error) {
      console.error("getAllUsers error:", error);
      return res.status(500).json({ message: "Failed to get users" });
    }
  };


export const createSubadmin = async (req, res) => {
    const { name, phone, email } = req.body;
    console.log("Controller: createUser", { name, phone, email });
  
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone must be 10 digits." });
    }
    if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }
  
    try {
      const [existing] = await pool.execute("SELECT * FROM users WHERE phone = ?", [phone]);
      console.log('existing',existing);
      if (existing.length > 0) {
        return res.status(409).json({ message: "Phone number already registered." });
      }
      const adminId = req.admin?.id || req.user?.id; 
      const [result] = await pool.execute(
        "INSERT INTO users (name, phone, email,  role) VALUES (?, ?, ?, ?)",
        [
          name || null,
          phone,
          email || null,
          "sub-admin" 
        ]
      );
  
      const userId = result.insertId;
  
      if (adminId) {
        await logAdminAction(adminId, "ADDED_Sub-Admin", "user", userId);
      }
  
      return res.status(201).json({ message: "Sub-Admin created successfully", user: { id: userId, name, phone, email } });
    } catch (error) {
      console.error("createUser error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };



  export const updateSubadmin = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email ,is_blocked} = req.body;
  
    console.log("Controller: updateSubadmin", { id, name, phone, email });
  
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone must be 10 digits.",
      });
    }
  
    if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email address.",
      });
    }
  
    try {
      // Check subadmin exists
      const [user] = await pool.execute(
        "SELECT * FROM users WHERE id = ? AND role = 'sub-admin'",
        [id]
      );
  
      if (user.length === 0) {
        return res.status(404).json({
          message: "Sub Admin not found.",
        });
      }
  
      // Check duplicate phone
      const [existingPhone] = await pool.execute(
        "SELECT id FROM users WHERE phone = ? AND id != ?",
        [phone, id]
      );
  
      if (existingPhone.length > 0) {
        return res.status(409).json({
          message: "Phone number already registered.",
        });
      }
  
      // Check duplicate email
      if (email) {
        const [existingEmail] = await pool.execute(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [email, id]
        );
  
        if (existingEmail.length > 0) {
          return res.status(409).json({
            message: "Email already registered.",
          });
        }
      }
  
      await pool.execute(
        `
        UPDATE users
        SET
          name = ?,
          phone = ?,
          email = ?,
          is_active=?
        WHERE id = ? AND role = 'sub-admin'
        `,
        [
          name || null,
          phone,
          email || null,
          is_blocked?0:1,
          id,
        ]
      );
  
      const adminId = req.admin?.id || req.user?.id;
  
      if (adminId) {
        await logAdminAction(
          adminId,
          "UPDATED_SUB_ADMIN",
          "user",
          id
        );
      }
  
      return res.json({
        message: "Sub Admin updated successfully.",
      });
  
    } catch (error) {
      console.error("updateSubadmin error:", error);
  
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };



  export const blockSubadmin = async (req, res) => {
    const { id } = req.params;
  
    console.log("Controller: blockSubadmin", { id });
  
    try {
      // Check sub-admin exists
      const [user] = await pool.execute(
        "SELECT id, is_blocked FROM users WHERE id = ? AND role = 'sub-admin'",
        [id]
      );
  
      if (user.length === 0) {
        return res.status(404).json({
          message: "Sub Admin not found.",
        });
      }
  
      // Toggle block status
      const newStatus = user[0].is_blocked ? 0 : 1;
  
      await pool.execute(
        "UPDATE users SET is_blocked = ? WHERE id = ?",
        [newStatus, id]
      );
  
      const adminId = req.admin?.id || req.user?.id;
  
      if (adminId) {
        await logAdminAction(
          adminId,
          newStatus ? "BLOCKED_SUB_ADMIN" : "UNBLOCKED_SUB_ADMIN",
          "user",
          id
        );
      }
  
      return res.json({
        success: true,
        message: newStatus
          ? "Sub Admin blocked successfully."
          : "Sub Admin unblocked successfully.",
        is_blocked: newStatus,
      });
    } catch (error) {
      console.error("blockSubadmin error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };


  // export const deleteSubadmin = async (req, res) => {
  //   const { id } = req.params;
  
  //   console.log("Controller: deleteSubadmin", { id });
  
  //   try {
  //     const [user] = await pool.execute(
  //       "SELECT * FROM users WHERE id = ? AND role = 'sub-admin'",
  //       [id]
  //     );
  
  //     if (user.length === 0) {
  //       return res.status(404).json({
  //         message: "Sub Admin not found.",
  //       });
  //     }
  
  //     await pool.execute(
  //       "DELETE FROM users WHERE id = ? AND role = 'sub-admin'",
  //       [id]
  //     );
  
  //     const adminId = req.admin?.id || req.user?.id;
  
  //     if (adminId) {
  //       await logAdminAction(
  //         adminId,
  //         "DELETED_SUB_ADMIN",
  //         "user",
  //         id
  //       );
  //     }
  
  //     return res.json({
  //       message: "Sub Admin deleted successfully.",
  //     });
  
  //   } catch (error) {
  //     console.error("deleteSubadmin error:", error);
  
  //     return res.status(500).json({
  //       message: "Internal server error",
  //     });
  //   }
  // };


  export const exportSubAdminReport = async (req, res) => {
    try {
      const {
        adminId = "",
        startDate = "",
        endDate = "",
        search = "",
        targetType = "",
      } = req.query;
  
      let whereClauses = ["1=1"];
      const params = [];
  
      if (search) {
        // whereClauses.push(`(
        //   aa.action LIKE ? OR
        //   aa.target_type LIKE ? OR
        //   aa.target_id LIKE ? OR
        //   u.name LIKE ?
        // )`);
  
        // const searchValue = `%${search}%`;
        // params.push(
        //   searchValue,
        //   searchValue,
        //   searchValue,
        //   searchValue
        // );

        whereClauses.push(`(
          aa.action LIKE ? OR
          aa.target_type LIKE ? OR
          aa.target_id LIKE ? OR
          u.name LIKE ? OR
          b.name LIKE ? OR
          tu.name LIKE ?
        )`);
        
        const searchValue = `%${search}%`;
        
        params.push(
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue
        );
      }
  
      if (adminId) {
        whereClauses.push("aa.admin_id = ?");
        params.push(adminId);
      }

      if (targetType) {
        whereClauses.push("aa.target_type = ?");
        params.push(targetType);
      }
  
      if (startDate && endDate) {
        whereClauses.push("DATE(aa.created_at) BETWEEN ? AND ?");
        params.push(startDate, endDate);
      }
  
      const whereSQL = whereClauses.join(" AND ");
  
      const [rows] = await pool.query(
        `
        SELECT
          aa.id,
          aa.admin_id,
          u.name AS admin_name,
          u.role,
          aa.action,
          aa.target_type,
          aa.target_id,
          b.name AS business_name,
          tu.name AS target_user_name,
          aa.created_at
        FROM admin_actions aa
      
        LEFT JOIN users u
          ON u.id = aa.admin_id
      
        LEFT JOIN businesses b
          ON aa.target_type = 'business'
         AND aa.target_id = b.id
      
        LEFT JOIN users tu
          ON aa.target_type = 'user'
         AND aa.target_id = tu.id
      
        WHERE ${whereSQL}
        ORDER BY aa.created_at DESC
        `,
        params
      );
  
      console.log("EXPORT ROWS:", rows.length);
  
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("SubAdmin Report");
  
      sheet.columns = [
        { header: "Admin", key: "admin_name", width: 30 },
        { header: "Role", key: "role", width: 20 },
        { header: "Action", key: "action", width: 30 },
        { header: "Target Type", key: "target_type", width: 20 },
        { header: "Target ID", key: "target_id", width: 15 },
        { header: "Target Name", key: "target_name", width: 35 },
        { header: "Created At", key: "created_at", width: 30 },
      ];
  
      rows.forEach((row) => {
        sheet.addRow({
          admin_name: row.admin_name,
          role: row.role,
          action: row.action,
          target_type: row.target_type,
          target_id: row.target_id,
          target_name:
          row.target_type === "business"
            ? row.business_name
            : row.target_type === "user"
            ? row.target_user_name
            : "-",
              created_at: row.created_at,
            });
      });
  
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
  
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=SubAdminReport.xlsx"
      );
  
      await workbook.xlsx.write(res);
  
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


