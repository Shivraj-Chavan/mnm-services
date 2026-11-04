import pool from "../config/db.js";

const clean = (v, n = 500) =>
  String(v ?? "").replace(/<[^>]*>/g, "").trim().slice(0, n) || null;
const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

/* POST /business/:businessId (owner, multipart) */
export const createAdRequest = async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { start_date, end_date } = req.body;
    if (!isYmd(start_date) || !isYmd(end_date))
      return res.status(400).json({ message: "Start and end dates are required" });
    if (end_date < start_date)
      return res.status(400).json({ message: "End date cannot be before the start date" });

    const [[chk]] = await pool.query("SELECT (? < CURDATE()) AS past", [start_date]);
    if (chk.past) return res.status(400).json({ message: "Start date cannot be in the past" });

    const [[biz]] = await pool.query(
      "SELECT id FROM businesses WHERE id = ? AND owner_id = ?",
      [businessId, req.user.id]
    );
    if (!biz) return res.status(404).json({ message: "Business not found" });

    const [open] = await pool.query(
      "SELECT id FROM ad_requests WHERE business_id = ? AND status = 'pending' LIMIT 1",
      [businessId]
    );
    if (open.length)
      return res.status(409).json({ message: "A request for this business is already waiting for the admin" });

    const desktop = req.files?.image_desktop?.[0]?.filename || null;
    const mobile = req.files?.image_mobile?.[0]?.filename || null;

    const [r] = await pool.query(
      `INSERT INTO ad_requests (business_id, user_id, start_date, end_date, message, image_desktop, image_mobile)
       VALUES (?,?,?,?,?,?,?)`,
      [businessId, req.user.id, start_date, end_date, clean(req.body.message), desktop, mobile]
    );
    res.status(201).json({ message: "Request sent to the admin", data: { id: r.insertId, status: "pending" } });
  } catch (err) {
    console.error("createAdRequest error:", err);
    res.status(500).json({ message: "Could not send the request" });
  }
};

/* GET /mine (owner): newest first */
export const getMyAdRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, business_id, status, message, admin_reason,
              DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
              DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,
              decided_at, created_at
         FROM ad_requests WHERE user_id = ? ORDER BY id DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("getMyAdRequests error:", err);
    res.status(500).json({ data: [] });
  }
};

/* GET /admin?status=&search=&page=&limit= */
export const adminListAdRequests = async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : null;
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));

    const where = [];
    const params = [];
    if (status) { where.push("r.status = ?"); params.push(status); }
    if (search) {
      where.push("(b.name LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";
    const FROM = `FROM ad_requests r
         JOIN businesses b ON b.id = r.business_id
         JOIN users u ON u.id = r.user_id`;

    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.message, r.admin_reason, r.image_desktop, r.image_mobile,
              DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date,
              DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
              r.decided_at, r.created_at,
              b.id AS business_id, b.name AS business_name,
              u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
         ${FROM} ${whereSQL}
        ORDER BY (r.status = 'pending') DESC, r.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${FROM} ${whereSQL}`, params);
    const [cr] = await pool.query("SELECT status, COUNT(*) AS n FROM ad_requests GROUP BY status");
    const counts = { pending: 0, approved: 0, rejected: 0 };
    cr.forEach((c) => { counts[c.status] = c.n; });

    res.json({ data: rows, page, limit, total, totalPages: Math.ceil(total / limit) || 1, counts });
  } catch (err) {
    console.error("adminListAdRequests error:", err);
    res.status(500).json({ message: "Could not load requests", detail: err.sqlMessage || err.message });
  }
};

/* GET /admin/:id: used to prefill the Add advertisement form */
export const adminGetAdRequest = async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT r.id, r.status, r.message, r.image_desktop, r.image_mobile,
              DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date,
              DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
              DATEDIFF(r.end_date, r.start_date) AS duration_days,
                  b.id AS business_id, b.name AS business_name, b.slug AS business_slug
         FROM ad_requests r JOIN businesses b ON b.id = r.business_id
        WHERE r.id = ?`,
      [Number(req.params.id)]
    );
    if (!row) return res.status(404).json({ message: "Request not found" });
    res.json({ data: row });
  } catch (err) {
    console.error("adminGetAdRequest error:", err);
    res.status(500).json({ message: "Could not load the request" });
  }
};

/* PUT /admin/:id/approve { message } */
export const adminApproveAdRequest = async (req, res) => {
  try {
    const [r] = await pool.query(
      `UPDATE ad_requests SET status='approved', admin_reason=?, decided_at=NOW(), decided_by=?
        WHERE id=? AND status='pending'`,
      [clean(req.body?.message), req.user.id, Number(req.params.id)]
    );
    if (!r.affectedRows) return res.status(409).json({ message: "This request is no longer pending" });
    res.json({ message: "Request approved" });
  } catch (err) {
    console.error("adminApproveAdRequest error:", err);
    res.status(500).json({ message: "Could not approve the request" });
  }
};

/* PUT /admin/:id/reject { reason } */
export const adminRejectAdRequest = async (req, res) => {
  try {
    const [r] = await pool.query(
      `UPDATE ad_requests SET status='rejected', admin_reason=?, decided_at=NOW(), decided_by=?
        WHERE id=? AND status='pending'`,
      [clean(req.body?.reason), req.user.id, Number(req.params.id)]
    );
    if (!r.affectedRows) return res.status(409).json({ message: "This request is no longer pending" });
    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error("adminRejectAdRequest error:", err);
    res.status(500).json({ message: "Could not reject the request" });
  }
};