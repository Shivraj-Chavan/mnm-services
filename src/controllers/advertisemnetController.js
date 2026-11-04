import pool from "../config/db.js";
import { REQUIRED_SIZES, AdError, validateBanner, saveImage, removeImage } from "../utils/adImages.js";

const COLS = `a.id, a.title, a.description, a.image_desktop, a.image_mobile,
  a.placement, a.category_id, a.business_id, a.payment_status,
  a.redirect_url, a.display_order, a.is_active, a.is_deleted,
  DATE_FORMAT(a.start_date,'%Y-%m-%d') AS start_date,
  DATE_FORMAT(a.end_date,'%Y-%m-%d') AS end_date,
  a.price, a.duration_days,
  a.created_by, a.created_at, a.updated_at`;

const LIVE = `a.is_deleted = 0
  AND a.is_active = 1
  AND (a.start_date IS NULL OR a.start_date <= CURDATE())
  AND (a.end_date IS NULL OR a.end_date >= CURDATE())`;
const PUBLIC_COLS = `a.id, a.title, a.description, a.image_desktop, a.image_mobile, a.placement,
  a.category_id, a.redirect_url, a.display_order`;
const PUBLIC_ORDER = `ORDER BY a.display_order ASC, a.created_at DESC`;

const ok = (res, message, data = null, status = 200) => res.status(status).json({ success: true, message, data });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof AdError) return res.status(err.status).json({ success: false, message: err.message });
    console.error("[advertisements]", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

const clean = (v, max) => String(v ?? "").replace(/<[^>]*>/g, "").trim().slice(0, max);

const parseId = (v, msg = "Invalid advertisement ID.") => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AdError(msg);
  return n;
};

const toBool = (v) => [true, 1, "1", "true", "on"].includes(v);

const toOrder = (v) => {
  if (v === "" || v == null) return 0;
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < 0 || n > 9999) throw new AdError("Display order must be a number between 0 and 9999.");
  return n;
};

const cleanDate = (v, label) => {
  if (v == null || v === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new AdError(`${label} must be in YYYY-MM-DD format.`);
  return String(v);
};

const cleanUrl = (v) => {
  const u = String(v ?? "").trim();
  if (!u) return null;
  if (u.length > 500) throw new AdError("Redirect URL is too long.");
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  try {
    if (["http:", "https:"].includes(new URL(u).protocol)) return u;
  } catch {}
  throw new AdError("Redirect URL must start with http://, https:// or / .");
};

async function assertCategory(id) {
  const [rows] = await pool.query("SELECT id FROM category WHERE id = ?", [id]);
  if (!rows.length) throw new AdError("Selected category does not exist.", 404);
}

function parseFields(b, cur = {}) {
  const pick = (k, d) => (b[k] !== undefined ? b[k] : d);
  const title = clean(pick("title", cur.title), 150);
  if (!title) throw new AdError("Advertisement title is required.");
  const start_date = cleanDate(pick("start_date", cur.start_date), "Start date");
  const end_date = cleanDate(pick("end_date", cur.end_date), "End date");
  if (start_date && end_date && start_date > end_date) throw new AdError("End date cannot be before start date.");
  return {
    title,
    description: clean(pick("description", cur.description), 500) || null,
    redirect_url: cleanUrl(pick("redirect_url", cur.redirect_url)),
    display_order: toOrder(pick("display_order", cur.display_order ?? 0)),
    is_active: toBool(pick("is_active", cur.is_active ?? 1)) ? 1 : 0,
    start_date,
    end_date,
  };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${COLS}, c.name AS category_name, b.name AS business_name, b.email AS business_email, b.phone AS business_phone
     FROM advertisements a
     LEFT JOIN category c ON c.id = a.category_id
     LEFT JOIN businesses b ON b.id = a.business_id
     WHERE a.id = ?`,
    [id]
  );
  if (!rows.length) throw new AdError("Advertisement not found.", 404);
  return rows[0];
}

export const create = async (req, res) => {
  try {
    return await createInner(req, res);
  } catch (err) {
    if (err?.name === "AdError") {
      return res.status(err.status || 400).json({ success: false, message: err.message });
    }
    console.error("create ad error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create advertisement",
      detail: err.sqlMessage || err.message,
    });
  }
};

const createInner = async (req, res) => {
  console.log("AD FILES:", JSON.stringify(req.files));
  const placement = req.body.placement;
  if (!REQUIRED_SIZES[placement]) throw new AdError("Placement must be 'homepage' or 'category'.");
  const f = parseFields(req.body);

  let category_id = null;
  if (placement === "category") {
    category_id = parseId(req.body.category_id, "Category is required for category advertisements.");
    await assertCategory(category_id);
  }

  const dFile = req.files?.image_desktop?.[0];
  const mFile = req.files?.image_mobile?.[0];
  const dExt = await validateBanner(dFile, "Desktop", REQUIRED_SIZES[placement].desktop);
  const mExt = await validateBanner(mFile, "Mobile", REQUIRED_SIZES[placement].mobile);

  const saved = [];
  try {
    const image_desktop = await saveImage(dFile, dExt);
    saved.push(image_desktop);
    const image_mobile = await saveImage(mFile, mExt);
    saved.push(image_mobile);

    const business_id = req.body.business_id ? parseId(req.body.business_id, "Invalid business.") : null;
    const [r] = await pool.query(
      `INSERT INTO advertisements
           (title, description, image_desktop, image_mobile, placement, category_id, business_id, redirect_url,
        display_order, is_active, start_date, end_date, created_by, price, duration_days, payment_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`,
      [f.title, f.description, image_desktop, image_mobile, placement, category_id, business_id, f.redirect_url,
       f.display_order, f.is_active, f.start_date, f.end_date, req.user?.id ?? null,
       Number(req.body.price) || 0, Number(req.body.duration_days) || 30]
    );
    ok(res, "Advertisement created successfully", await findById(r.insertId), 201);
  } catch (err) {
    await Promise.all(saved.map(removeImage));
    throw err;
  }
};

export const list = wrap(async (req, res) => {
  const { search, placement, category_id, status, date } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (search) {
    where.push("(a.title LIKE ? OR a.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (placement) { where.push("a.placement = ?"); params.push(placement); }
  if (category_id) { where.push("a.category_id = ?"); params.push(parseId(category_id, "Invalid category.")); }
  if (status === "active") where.push("a.is_active = 1");
  if (status === "inactive") where.push("a.is_active = 0");
  if (date) {
    const d = cleanDate(date, "Date");
    where.push("((a.start_date IS NULL OR a.start_date <= ?) AND (a.end_date IS NULL OR a.end_date >= ?))");
    params.push(d, d);
  }
  const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";

  const [rows] = await pool.query(
    `SELECT ${COLS}, c.name AS category_name, b.name AS business_name, b.email AS business_email, b.phone AS business_phone
     FROM advertisements a
     LEFT JOIN category c ON c.id = a.category_id
     LEFT JOIN businesses b ON b.id = a.business_id
     ${whereSQL}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM advertisements a ${whereSQL}`,
    params
  );

  res.status(200).json({
    success: true,
    message: "Advertisements fetched successfully",
    data: rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

export const getById = wrap(async (req, res) => {
  ok(res, "Advertisement fetched successfully", await findById(parseId(req.params.id)));
});

export const update = wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const cur = await findById(id);
  const f = parseFields(req.body, cur);

  let category_id = cur.category_id;
  if (cur.placement === "category" && req.body.category_id !== undefined) {
    category_id = parseId(req.body.category_id, "Category is required for category advertisements.");
    await assertCategory(category_id);
  }

  const sizes = REQUIRED_SIZES[cur.placement];
  const dFile = req.files?.image_desktop?.[0];
  const mFile = req.files?.image_mobile?.[0];
  const dExt = dFile ? await validateBanner(dFile, "Desktop", sizes.desktop) : null;
  const mExt = mFile ? await validateBanner(mFile, "Mobile", sizes.mobile) : null;

  const newFiles = [];
  try {
    let image_desktop = cur.image_desktop;
    let image_mobile = cur.image_mobile;
    if (dFile) { image_desktop = await saveImage(dFile, dExt); newFiles.push(image_desktop); }
    if (mFile) { image_mobile = await saveImage(mFile, mExt); newFiles.push(image_mobile); }

    const business_id = req.body.business_id !== undefined
      ? (req.body.business_id ? parseId(req.body.business_id, "Invalid business.") : null)
      : cur.business_id;

    await pool.query(
      `UPDATE advertisements SET title=?, description=?, image_desktop=?, image_mobile=?, category_id=?, business_id=?,
         redirect_url=?, display_order=?, is_active=?, start_date=?, end_date=?, price=?, duration_days=? WHERE id=?`,
      [f.title, f.description, image_desktop, image_mobile, category_id, business_id, f.redirect_url,
       f.display_order, f.is_active, f.start_date, f.end_date,
       Number(req.body.price) || cur.price, Number(req.body.duration_days) || cur.duration_days, id]
    );

    if (dFile) await removeImage(cur.image_desktop);
    if (mFile) await removeImage(cur.image_mobile);
    ok(res, "Advertisement updated successfully", await findById(id));
  } catch (err) {
    await Promise.all(newFiles.map(removeImage));
    throw err;
  }
});


export const remove = wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const cur = await findById(id);

  await pool.query(
    `UPDATE advertisements
     SET is_deleted = 1, is_active = 0
     WHERE id = ? AND is_deleted = 0`,
    [id]
  );

  ok(res, "Advertisement deleted successfully", {
    id,
    is_deleted: 1,
  });
});

export const toggleStatus = wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const cur = await findById(id);
  const next = req.body?.is_active !== undefined ? (toBool(req.body.is_active) ? 1 : 0) : cur.is_active ? 0 : 1;
  await pool.query("UPDATE advertisements SET is_active = ? WHERE id = ?", [next, id]);
  ok(res, next ? "Advertisement activated" : "Advertisement deactivated", await findById(id));
});

export const getHomepage = wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLS} FROM advertisements a WHERE a.placement = 'homepage' AND a.payment_status = 'paid' AND ${LIVE} ${PUBLIC_ORDER}`
  );
  res.set("Cache-Control", "public, max-age=60");
  ok(res, "Homepage advertisements fetched successfully", rows);
});

export const getByCategory = wrap(async (req, res) => {
  const categoryId = parseId(req.params.categoryId, "Invalid category ID.");
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLS} FROM advertisements a
     WHERE a.placement = 'category' AND a.category_id = ? AND a.payment_status = 'paid' AND ${LIVE} ${PUBLIC_ORDER}`,
    [categoryId]
  );
  res.set("Cache-Control", "public, max-age=60");
  ok(res, "Category advertisements fetched successfully", rows);
});

// Business owner: list all ads linked to one of their businesses (any status, so
// they can see pending/unpaid ones too — not filtered by LIVE).
export const getByBusiness = wrap(async (req, res) => {
  const businessId = parseId(
    req.params.businessId,
    "Invalid business ID."
  );

  const [[biz]] = await pool.query(
    `SELECT id, category_id
     FROM businesses
     WHERE id = ? AND owner_id = ?`,
    [businessId, req.user.id]
  );

  if (!biz) {
    throw new AdError("Business not found or not owned by you.", 404);
  }

  const [rows] = await pool.query(
    `SELECT
       a.id,
       a.title,
       a.description,
       a.image_desktop,
       a.image_mobile,
       a.placement,
       a.category_id,
       a.business_id,
       a.redirect_url,
       a.display_order,
       a.is_active,
       a.start_date,
       a.end_date,
       a.created_at,
       c.name AS category_name
     FROM advertisements a
     LEFT JOIN category c ON c.id = a.category_id
     WHERE a.business_id = ?
        OR (
          a.placement = 'category'
          AND a.category_id = ?
        )
     ORDER BY a.created_at DESC`,
    [businessId, biz.category_id]
  );

  return ok(
    res,
    "Business advertisements fetched successfully",
    rows
  );
});