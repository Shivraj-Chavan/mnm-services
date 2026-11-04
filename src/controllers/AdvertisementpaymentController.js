/**
 * Advertisement payment controller (Razorpay) - simple flow, no GST, no invoice.
 *   create order -> user pays -> verify signature -> activate banner
 * Uses its own table (ad_payments); the plan `payments` table is untouched.
 *
 * .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET (optional, webhook only)
 */
import crypto from "crypto";
import Razorpay from "razorpay";
import pool from "../config/db.js";
import { createAndSendAdInvoice } from "../utils/adInvoice.js"; // adjust to where you saved it

// Created on first use so .env is always loaded and a missing key can't crash startup
let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID; 
    const key_secret = process.env.RAZORPAY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in .env");
    }
    razorpayInstance = new Razorpay({ key_id, key_secret });
  }
  return razorpayInstance;
};

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* Marks the payment paid and activates the banner. Safe to run twice. */
async function activatePayment({ orderId, paymentId, signature }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM ad_payments WHERE razorpay_order_id = ? FOR UPDATE",
      [orderId]
    );
    const pay = rows[0];
    if (!pay) throw new Error("Payment record not found");

    let activated = false;
    if (pay.status !== "paid") {
      activated = true;
      await conn.query(
        `UPDATE ad_payments
            SET status='paid', razorpay_payment_id=?, razorpay_signature=?, paid_at=NOW()
          WHERE id=?`,
        [paymentId, signature || null, pay.id]
      );
      if (pay.renewal_request_id) {
        // paying an approved renewal: the admin's dates and price apply
        const [[rr]] = await conn.query(
          `SELECT approved_price, DATE_FORMAT(approved_start,'%Y-%m-%d') AS approved_start,
                  DATE_FORMAT(approved_end,'%Y-%m-%d') AS approved_end
             FROM ad_renewal_requests WHERE id = ? FOR UPDATE`,
          [pay.renewal_request_id]
        );
        await conn.query(
          `UPDATE advertisements
              SET payment_status='paid', is_active=1, start_date=?, end_date=?, price=?
            WHERE id=?`,
          [rr.approved_start, rr.approved_end, rr.approved_price, pay.advertisement_id]
        );
        await conn.query(
          "UPDATE ad_renewal_requests SET status='paid', paid_at=NOW() WHERE id=?",
          [pay.renewal_request_id]
        );
      } else {
        await conn.query(
          `UPDATE advertisements
              SET payment_status='paid',
                  is_active=1,
                  start_date=CURDATE(),
                  end_date=DATE_ADD(CURDATE(), INTERVAL duration_days DAY)
            WHERE id=?`,
          [pay.advertisement_id]
        );
      }

      // remember which period this payment bought (used by the history view)
      await conn.query(
        `UPDATE ad_payments p
           JOIN advertisements a ON a.id = p.advertisement_id
            SET p.period_start = a.start_date, p.period_end = a.end_date
          WHERE p.id = ?`,
        [pay.id]
      );
    }

    await conn.commit();
    return { pay, activated };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* ───────── POST /:id/createOrder ───────── */
export const createOrder = async (req, res) => {
  try {
    const adId = Number(req.params.id);

    // ad must belong to a business owned by the logged-in user (businesses.owner_id)
    const [rows] = await pool.query(
      `SELECT a.id, a.business_id, a.price, a.payment_status, a.end_date,
      (a.payment_status = 'paid' AND (a.end_date IS NULL OR a.end_date >= CURDATE())) AS is_running
        FROM advertisements a
         JOIN businesses b ON b.id = a.business_id
        WHERE a.id = ? AND b.owner_id = ?`,
      [adId, req.user.id]
    );
    const ad = rows[0];
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });

    if (ad.is_running) {
      return res.status(409).json({ message: "This advertisement is already active" });
    }

    // an expired (already paid once) banner can only be paid through an approved renewal
    let price = Number(ad.price);
    let renewalId = null;
    if (ad.payment_status === "paid") {
      const [[rr]] = await pool.query(
        `SELECT id, approved_price FROM ad_renewal_requests
          WHERE advertisement_id = ? AND user_id = ? AND status = 'approved'
          ORDER BY id DESC LIMIT 1`,
        [adId, req.user.id]
      );
      if (!rr) {
        return res.status(403).json({ message: "Request a renewal first. The admin will approve it and set the price." });
      }
      price = Number(rr.approved_price);
      renewalId = rr.id;
    }

    // amount comes from the DB, never from the browser
    const amountPaise = Math.round(price * 100);
    if (!amountPaise || amountPaise < 100) {
      return res.status(400).json({ message: "Invalid advertisement price" });
    }

    const order = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `ad_${adId}_${Date.now()}`.slice(0, 40),
    });

    await pool.query(
      `INSERT INTO ad_payments
         (advertisement_id, business_id, user_id, amount, currency, razorpay_order_id, renewal_request_id, status)
       VALUES (?,?,?,?,?,?,?, 'created')`,
      [adId, ad.business_id, req.user.id, amountPaise, "INR", order.id, renewalId]
    );

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID, // public key id only
      },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({
      message: "Could not create payment order",
      detail: err?.error?.description || err.message,
    });
  }
};

/* ───────── POST /:id/verifyPayment ───────── */
export const verifyPayment = async (req, res) => {
  try {
    const adId = Number(req.params.id);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM ad_payments WHERE razorpay_order_id=? AND advertisement_id=? AND user_id=?",
      [razorpay_order_id, adId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Payment record not found" });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (!safeEqual(expected, razorpay_signature)) {
      await pool.query("UPDATE ad_payments SET status='failed' WHERE id=? AND status='created'", [rows[0].id]);
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const { pay, activated } = await activatePayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (activated) {
      // not awaited: an invoice or mail failure must never fail the payment
      createAndSendAdInvoice(pay.id).catch((e) => console.error("ad invoice error:", e));
    }

    res.json({ success: true, message: "Payment verified. Advertisement is live." });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ───────── POST /webhook/razorpay (optional safety net) ─────────
   Needs RAW body + RAZORPAY_WEBHOOK_SECRET. Events: payment.captured, payment.failed */
export const razorpayWebhook = async (req, res) => {
  try {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(req.body) // Buffer
      .digest("hex");
    if (!safeEqual(expected, req.headers["x-razorpay-signature"])) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));
    const entity = event?.payload?.payment?.entity;

    if (event.event === "payment.captured" && entity) {
      const { pay, activated } = await activatePayment({ orderId: entity.order_id, paymentId: entity.id });
      console.log("[ad invoice] verifyPayment activated =", activated, "payment row", pay.id);
    if (activated) {
        createAndSendAdInvoice(pay.id).catch((e) => console.error("ad invoice error:", e));
      }
    } else if (event.event === "payment.failed" && entity) {
      await pool.query(
        "UPDATE ad_payments SET status='failed' WHERE razorpay_order_id=? AND status='created'",
        [entity.order_id]
      );
    }
    res.json({ received: true });
  } catch (err) {
    console.error("webhook error:", err);
    res.status(500).send("error");
  }
};

/* ───────── GET /business/:businessId (owner dashboard) ───────── */

export const getBusinessAds = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        a.id,
        a.title,
        a.description,
        a.image_desktop,
        a.image_mobile,
        a.redirect_url,
        a.placement,
        a.category_id,
        c.name AS category_name,
        a.business_id,
        a.is_active,
        a.payment_status,
        a.price,
        a.duration_days,
        DATE_FORMAT(a.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(a.end_date, '%Y-%m-%d') AS end_date,
        r.id AS renewal_id,
        r.status AS renewal_status,
        r.admin_reason AS renewal_reason,
        r.approved_price AS renewal_price,
        DATE_FORMAT(r.approved_start, '%Y-%m-%d') AS renewal_start,
        DATE_FORMAT(r.approved_end, '%Y-%m-%d') AS renewal_end
      FROM advertisements a
      JOIN businesses b ON b.id = a.business_id
      LEFT JOIN category c ON c.id = a.category_id
      LEFT JOIN ad_renewal_requests r
        ON r.id = (
          SELECT MAX(id)
          FROM ad_renewal_requests
          WHERE advertisement_id = a.id
        )
      WHERE a.business_id = ?
        AND b.owner_id = ?
        AND a.is_deleted = 0
      ORDER BY a.id DESC`,
      [req.params.businessId, req.user.id]
    );

    return res.json({ data: rows });

  } catch (err) {
    console.error("getBusinessAds error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not load business advertisements",
      detail: err.sqlMessage || err.message
    });
  }
};


/* ───────── POST /:id/renewal-request (owner) ───────── */

export const requestRenewal = async (req, res) => {
  try {
    const adId = Number(req.params.id);

    const note = String(req.body?.note ?? "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, 500);

    const start_date = String(req.body?.start_date || "");
    const end_date = String(req.body?.end_date || "");

    const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

    if (!adId || !Number.isInteger(adId)) {
      return res.status(400).json({ message: "Invalid advertisement ID" });
    }

    if (!note) {
      return res.status(400).json({ message: "Please add a description" });
    }

    if (!isYmd(start_date) || !isYmd(end_date)) {
      return res.status(400).json({
        message: "Start and end dates are required"
      });
    }

    if (end_date < start_date) {
      return res.status(400).json({
        message: "End date cannot be before the start date"
      });
    }

    // First fetch advertisement and verify ownership
    const [rows] = await pool.query(
      `SELECT
          a.id,
          a.business_id,
          a.payment_status,
      (a.end_date IS NOT NULL AND a.end_date <= CURDATE()) AS is_expired
       FROM advertisements a
       JOIN businesses b ON b.id = a.business_id
       WHERE a.id = ? AND b.owner_id = ?`,
      [adId, req.user.id]
    );

    const ad = rows[0];

    if (!ad) {
      return res.status(404).json({
        message: "Advertisement not found"
      });
    }

    // Only paid and expired banners can be renewed
    if (ad.payment_status !== "paid" || Number(ad.is_expired) !== 1) {
      return res.status(400).json({
        message: "Only an expired banner can be renewed"
      });
    }

    // Check existing pending or approved request
    const [open] = await pool.query(
      `SELECT id
       FROM ad_renewal_requests
       WHERE advertisement_id = ?
       AND status IN ('pending', 'approved')
       LIMIT 1`,
      [adId]
    );

    if (open.length > 0) {
      return res.status(409).json({
        message: "A renewal request is already open for this banner"
      });
    }

    // Insert renewal request
    const [result] = await pool.query(
      `INSERT INTO ad_renewal_requests (
          advertisement_id,
          business_id,
          user_id,
          note,
          requested_start,
          requested_end,
          status
       ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        ad.id,
        ad.business_id,
        req.user.id,
        note,
        start_date,
        end_date
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Renewal request sent to the admin",
      data: {
        id: result.insertId,
        status: "pending"
      }
    });

  } catch (err) {
    console.error("requestRenewal error:", err);

    return res.status(500).json({
      message: "Could not send the renewal request",
      detail: err.sqlMessage || err.message
    });
  }
};


/* ───────── GET /:id/history (owner): every paid run and every renewal request ───────── */
export const getAdHistory = async (req, res) => {
  try {
    const adId = Number(req.params.id);
    const [[ad]] = await pool.query(
      `SELECT a.id, a.title, a.payment_status, a.price,
              DATE_FORMAT(a.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(a.end_date,'%Y-%m-%d') AS end_date
         FROM advertisements a
         JOIN businesses b ON b.id = a.business_id
              WHERE a.id = ? AND (b.owner_id = ? OR ?)`,
      [adId, req.user.id, ["admin", "sub-admin"].includes(req.user.role) ? 1 : 0]
    );
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });

    const [payments]= await pool.query(
      `SELECT id, ROUND(amount / 100, 2) AS price, razorpay_payment_id, paid_at, renewal_request_id,
              DATE_FORMAT(period_start,'%Y-%m-%d') AS period_start, DATE_FORMAT(period_end,'%Y-%m-%d') AS period_end
         FROM ad_payments WHERE advertisement_id = ? AND status = 'paid' ORDER BY id DESC`,
      [adId]
    );
    const [requests] = await pool.query(
      `SELECT id, status, note, admin_reason, approved_price, decided_at, paid_at, created_at,
              DATE_FORMAT(approved_start,'%Y-%m-%d') AS approved_start, DATE_FORMAT(approved_end,'%Y-%m-%d') AS approved_end
         FROM ad_renewal_requests WHERE advertisement_id = ? ORDER BY id DESC`,
      [adId]
    );
    res.json({ data: { ad, payments, requests } });
  } catch (err) {
    console.error("getAdHistory error:", err);
    res.status(500).json({ message: "Could not load the history", detail: err.sqlMessage || err.message });
  }
};

/* ───────── ADMIN: GET /renewals?status=&search=&page=&limit= ───────── */
export const adminListRenewals = async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected", "paid"].includes(req.query.status) ? req.query.status : null;
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));

    const where = [];
    const params = [];
    if (status) { where.push("r.status = ?"); params.push(status); }
    if (search) {
      where.push("(a.title LIKE ? OR b.name LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";
    const FROM = `FROM ad_renewal_requests r
         JOIN advertisements a ON a.id = r.advertisement_id
         JOIN businesses b ON b.id = r.business_id
         JOIN users u ON u.id = r.user_id`;

    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.note, r.admin_reason, r.approved_price,
      DATE_FORMAT(r.requested_start,'%Y-%m-%d') AS requested_start,
      DATE_FORMAT(r.requested_end,'%Y-%m-%d') AS requested_end,
              DATE_FORMAT(r.approved_start,'%Y-%m-%d') AS approved_start,
              DATE_FORMAT(r.approved_end,'%Y-%m-%d') AS approved_end,
              r.decided_at, r.paid_at, r.created_at,
                        a.id AS advertisement_id, a.title, a.image_desktop, a.placement,
              a.price AS current_price,
              DATE_FORMAT(a.start_date,'%Y-%m-%d') AS prev_start, DATE_FORMAT(a.end_date,'%Y-%m-%d') AS prev_end,
              b.id AS business_id, b.name AS business_name,
              u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
         ${FROM}
         ${whereSQL}
        ORDER BY (r.status = 'pending') DESC, r.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${FROM} ${whereSQL}`, params);

    const [countRows] = await pool.query("SELECT status, COUNT(*) AS n FROM ad_renewal_requests GROUP BY status");
    const counts = { pending: 0, approved: 0, rejected: 0, paid: 0 };
    countRows.forEach((c) => { counts[c.status] = c.n; });

    res.json({ data: rows, page, limit, total, totalPages: Math.ceil(total / limit) || 1, counts });
  } catch (err) {
    console.error("adminListRenewals error:", err);
    res.status(500).json({ message: "Could not load renewal requests", detail: err.sqlMessage || err.message });
  }
};

/* ───────── ADMIN: PUT /renewals/:id/approve  { price, start_date, end_date } ───────── */
export const adminApproveRenewal = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const price = Number(req.body?.price);
    const start = String(req.body?.start_date || "");
    const end = String(req.body?.end_date || "");
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

    if (!Number.isFinite(price) || price < 1) return res.status(400).json({ message: "Enter a valid price (at least ₹1)" });
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ message: "Start and end dates are required" });
    if (end < start) return res.status(400).json({ message: "End date cannot be before the start date" });

    const [r] = await pool.query(
      `UPDATE ad_renewal_requests
          SET status='approved', approved_price=?, approved_start=?, approved_end=?,
              admin_reason=NULL, decided_at=NOW(), decided_by=?
        WHERE id=? AND status='pending'`,
      [price, start, end, req.user.id, id]
    );
    if (!r.affectedRows) return res.status(409).json({ message: "This request is no longer pending" });
    res.json({ message: "Renewal approved. The owner can now pay." });
  } catch (err) {
    console.error("adminApproveRenewal error:", err);
    res.status(500).json({ message: "Could not approve the request" });
  }
};

/* ───────── ADMIN: PUT /renewals/:id/reject  { reason } ───────── */
export const adminRejectRenewal = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 500) || null;

    const [r] = await pool.query(
      `UPDATE ad_renewal_requests
          SET status='rejected', admin_reason=?, decided_at=NOW(), decided_by=?
        WHERE id=? AND status='pending'`,
      [reason, req.user.id, id]
    );
    if (!r.affectedRows) return res.status(409).json({ message: "This request is no longer pending" });
    res.json({ message: "Renewal rejected" });
  } catch (err) {
    console.error("adminRejectRenewal error:", err);
    res.status(500).json({ message: "Could not reject the request" });
  }
};

/* ───────── PUT /:id/paymentStatus (admin) ─────────
   paid  -> activates the banner and fills start/end dates if empty
   other -> deactivates the banner */
   export const updatePaymentStatus = async (req, res) => {
    try {
      const { payment_status } = req.body;
      if (!["pending", "paid", "failed"].includes(payment_status)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }
  
      const [result] = await pool.query(
        `UPDATE advertisements
            SET payment_status = ?,
                is_active  = IF(? = 'paid', 1, 0),
                start_date = IF(? = 'paid', COALESCE(start_date, CURDATE()), start_date),
                end_date   = IF(? = 'paid',
                                COALESCE(end_date, DATE_ADD(COALESCE(start_date, CURDATE()), INTERVAL duration_days DAY)),
                                end_date)
          WHERE id = ?`,
        [payment_status, payment_status, payment_status, payment_status, req.params.id]
      );
      if (!result.affectedRows) return res.status(404).json({ message: "Advertisement not found" });
  
      const [[row]] = await pool.query(
        `SELECT id, payment_status, is_active,
        DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date
   FROM advertisements WHERE id = ?`,
        [req.params.id]
      );
      res.json({ message: "Payment status updated", data: row });
    } catch (err) {
      console.error("updatePaymentStatus error:", err);
      res.status(500).json({ message: "Could not update payment status" });
    }
  };
  
/* ───────── GET /homepage (public) ─────────
   Only paid, active ads whose dates are running today. */


   
export const getPublicHomepageAds = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          id,
          title,
          description,
          image_desktop,
          image_mobile,
          redirect_url,
          display_order,
          payment_status,
          DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
          DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
       FROM advertisements
       WHERE placement = 'homepage'
         AND payment_status = 'paid'
         AND is_active = 1
         AND (start_date IS NULL OR start_date <= CURDATE())
         AND (end_date IS NULL OR end_date >= CURDATE())
       ORDER BY display_order ASC, id DESC`
    );

    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getPublicHomepageAds error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage advertisements",
      data: [],
    });
  }
};


  
  /* ───────── GET /category/:categoryId (public) ─────────
   Only successfully paid, active, non-expired ads. */
   export const getPublicCategoryAds = async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, title, description, image_desktop, image_mobile, redirect_url, category_id,
                end_date, payment_status
           FROM advertisements
          WHERE category_id = ?
            AND payment_status = 'paid'
          AND is_active = 1
          AND (end_date IS NULL OR end_date >= CURDATE())
        ORDER BY id DESC`,
      [req.params.categoryId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("getPublicCategoryAds error:", err);
    res.status(500).json({ data: [], detail: err.sqlMessage || err.message });
  }
};