import { generateAdInvoice } from "../utils/generateAdInvoice.js";
import { sendAdInvoiceEmail } from "../utils/sendInvoiceMail.js";
import pool  from "../config/db.js"; 

const GST_RATE = 18; // confirm with your accountant

export const createAndSendAdInvoice = async (paymentRowId) => {
  // table and column names are guesses: adjust to your schema
  const [[row]] = await pool.query(
    `SELECT p.id, ROUND(p.amount / 100, 2) AS price, p.razorpay_payment_id, p.paid_at,
            COALESCE(p.period_start, a.start_date) AS period_start,
            COALESCE(p.period_end,   a.end_date)   AS period_end,
            a.title, b.name AS business_name,
            u.name AS owner_name, COALESCE(u.email, b.email) AS email, u.phone AS phone
       FROM ad_payments p
       JOIN advertisements a ON a.id = p.advertisement_id
       JOIN businesses b ON b.id = p.business_id
       JOIN users u ON u.id = p.user_id
      WHERE p.id = ? AND p.status = 'paid'`,
    [paymentRowId]
  );
  if (!row) {
    console.log("[ad invoice] no row for payment", paymentRowId, "(status not paid, or a join failed)");
    return;
  }
  console.log("[ad invoice] start", { id: row.id, email: row.email, price: row.price });

  const invoiceNo = `AD-${new Date().getFullYear()}-${String(row.id).padStart(5, "0")}`;

  // claim the invoice so verify + webhook cannot both send it
  const [claim] = await pool .query(
    "UPDATE ad_payments SET invoice_no = ? WHERE id = ? AND invoice_no IS NULL",
    [invoiceNo, row.id]
  );
  if (!claim.affectedRows) {
    console.log("[ad invoice] already claimed, skipping", row.id);
    return;
  }

  try {
    const amount = Number(row.price);
    const taxableAmount = +(amount / (1 + GST_RATE / 100)).toFixed(2);
    const gst = +(amount - taxableAmount).toFixed(2);
    const cgst = +(gst / 2).toFixed(2);
    const sgst = +(gst - cgst).toFixed(2);

    const filePath = await generateAdInvoice({
      invoiceNo,
      customerName: row.owner_name,
      customerEmail: row.email,
      customerPhone: row.phone,
      businessName: row.business_name,
      adTitle: row.title,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      amount: amount.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      paymentId: row.razorpay_payment_id,
      paymentDate: row.paid_at || new Date(),
    });

    console.log("[ad invoice] PDF created:", filePath);
    await sendAdInvoiceEmail({
      to: row.email,
      customerName: row.owner_name,
      invoicePath: filePath,
      invoiceNo,
      adTitle: row.title,
      businessName: row.business_name,
      amount: amount.toFixed(2),
    });
  } catch (err) {
    // release the claim so a retry can run
    await pool .query("UPDATE ad_payments SET invoice_no = NULL WHERE id = ?", [row.id]);
    throw err;
  }
};