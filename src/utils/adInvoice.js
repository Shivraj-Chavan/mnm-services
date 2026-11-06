// import { generateAdInvoice } from "../utils/generateAdInvoice.js";
// import { sendAdInvoiceEmail } from "../utils/sendInvoiceMail.js";
// import pool  from "../config/db.js"; 

// const GST_RATE = 18; // confirm with your accountant

// export const createAndSendAdInvoice = async (paymentRowId) => {
//   // table and column names are guesses: adjust to your schema
//   const [[row]] = await pool.query(
//     `SELECT p.id, ROUND(p.amount / 100, 2) AS price, p.razorpay_payment_id, p.paid_at,
//             COALESCE(p.period_start, a.start_date) AS period_start,
//             COALESCE(p.period_end,   a.end_date)   AS period_end,
//             a.title, b.name AS business_name,
//             u.name AS owner_name, COALESCE(u.email, b.email) AS email, u.phone AS phone
//        FROM ad_payments p
//        JOIN advertisements a ON a.id = p.advertisement_id
//        JOIN businesses b ON b.id = p.business_id
//        JOIN users u ON u.id = p.user_id
//       WHERE p.id = ? AND p.status = 'paid'`,
//     [paymentRowId]
//   );
//   if (!row) {
//     console.log("[ad invoice] no row for payment", paymentRowId, "(status not paid, or a join failed)");
//     return;
//   }
//   console.log("[ad invoice] start", { id: row.id, email: row.email, price: row.price });

//   const invoiceNo = `AD-${new Date().getFullYear()}-${String(row.id).padStart(5, "0")}`;

//   // claim the invoice so verify + webhook cannot both send it
//   const [claim] = await pool .query(
//     "UPDATE ad_payments SET invoice_no = ? WHERE id = ? AND invoice_no IS NULL",
//     [invoiceNo, row.id]
//   );
//   if (!claim.affectedRows) {
//     console.log("[ad invoice] already claimed, skipping", row.id);
//     return;
//   }

//   try {
//     const amount = Number(row.price);
//     const taxableAmount = +(amount / (1 + GST_RATE / 100)).toFixed(2);
//     const gst = +(amount - taxableAmount).toFixed(2);
//     const cgst = +(gst / 2).toFixed(2);
//     const sgst = +(gst - cgst).toFixed(2);

//     const filePath = await generateAdInvoice({
//       invoiceNo,
//       customerName: row.owner_name,
//       customerEmail: row.email,
//       customerPhone: row.phone,
//       businessName: row.business_name,
//       adTitle: row.title,
//       periodStart: row.period_start,
//       periodEnd: row.period_end,
//       amount: amount.toFixed(2),
//       taxableAmount: taxableAmount.toFixed(2),
//       cgst: cgst.toFixed(2),
//       sgst: sgst.toFixed(2),
//       paymentId: row.razorpay_payment_id,
//       paymentDate: row.paid_at || new Date(),
//     });

//     console.log("[ad invoice] PDF created:", filePath);
//     await sendAdInvoiceEmail({
//       to: row.email,
//       customerName: row.owner_name,
//       invoicePath: filePath,
//       invoiceNo,
//       adTitle: row.title,
//       businessName: row.business_name,
//       amount: amount.toFixed(2),
//     });
//   } catch (err) {
//     // release the claim so a retry can run
//     await pool .query("UPDATE ad_payments SET invoice_no = NULL WHERE id = ?", [row.id]);
//     throw err;
//   }
// };













import pool from "../config/db.js";
import path from "path";
import { generateAdInvoice } from "./generateAdInvoice.js";
import { sendAdInvoiceEmail } from "./sendInvoiceMail.js";

const GST_RATE = 18; // Confirm your actual GST treatment with your accountant.

export const createAndSendAdInvoice = async (paymentRowId) => {
  console.log("\n========== CREATE AD INVOICE START ==========");
  console.log("Payment Row ID:", paymentRowId);

  try {
    const [[row]] = await pool.query(
      `SELECT
          p.id,
          p.business_id,
          p.advertisement_id,
          p.invoice_no,
          ROUND(p.amount / 100, 2) AS price,
          p.razorpay_payment_id,
          p.paid_at,
          COALESCE(p.period_start, a.start_date) AS period_start,
          COALESCE(p.period_end, a.end_date) AS period_end,
          a.title,
          b.name AS business_name,
          u.name AS owner_name,
          COALESCE(u.email, b.email) AS email,
          u.phone AS phone
       FROM ad_payments p
       JOIN advertisements a ON a.id = p.advertisement_id
       JOIN businesses b ON b.id = p.business_id
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ? AND p.status = 'paid'`,
      [paymentRowId]
    );

    console.log("[ad invoice] payment details:", row);

    if (!row) {
      console.error("[ad invoice] Payment not found or payment is not paid.");
      return;
    }

    if (!row.razorpay_payment_id) {
      throw new Error("Razorpay payment ID is missing");
    }

    if (!row.email) {
      throw new Error("Customer email is missing");
    }

    // Check whether an invoice already exists for this Razorpay payment.
    const [[existingInvoice]] = await pool.query(
      `SELECT id, invoice_number, invoice_path, email_sent
       FROM ad_invoices
       WHERE payment_id = ?
       LIMIT 1`,
      [row.razorpay_payment_id]
    );

    if (existingInvoice?.email_sent) {
      console.log("[ad invoice] Invoice already created and emailed:", existingInvoice);
      return;
    }

    const invoiceNo =
      existingInvoice?.invoice_number ||
      row.invoice_no ||
      `AD-${new Date().getFullYear()}-${String(row.id).padStart(5, "0")}`;

    // Claim invoice number to prevent verify + webhook duplication.
    if (!row.invoice_no && !existingInvoice) {
      const [claim] = await pool.query(
        `UPDATE ad_payments
         SET invoice_no = ?
         WHERE id = ? AND invoice_no IS NULL`,
        [invoiceNo, row.id]
      );

      console.log("[ad invoice] Invoice claim:", claim.affectedRows);

      if (!claim.affectedRows) {
        console.warn("[ad invoice] Another process may be generating this invoice.");
        return;
      }
    }

    const amount = Number(row.price);

    // Existing tax calculation retained. Verify GST treatment before using in production.
    const taxableAmount = +(amount / (1 + GST_RATE / 100)).toFixed(2);
    const gst = +(amount - taxableAmount).toFixed(2);
    const cgst = +(gst / 2).toFixed(2);
    const sgst = +(gst - cgst).toFixed(2);

    let fileName;
    let filePath;

    if (existingInvoice?.invoice_path && !existingInvoice.email_sent) {
      fileName = path.basename(existingInvoice.invoice_path);
      filePath = path.join(
        process.cwd(),
        "uploads",
        "invoices",
        fileName
      );

      console.log("[ad invoice] Reusing existing PDF:", filePath);
    } else {
      filePath = await generateAdInvoice({
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

      fileName = path.basename(filePath);
      console.log("[ad invoice] PDF generated:", filePath);
    }

    // IMPORTANT: Save invoice in database.
    const [insertResult] = await pool.query(
      `INSERT INTO ad_invoices (
          business_id,
          advertisement_id,
          payment_id,
          invoice_number,
          customer_name,
          customer_email,
          business_name,
          ad_title,
          amount,
          invoice_path,
          email_sent,
          payment_date
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE
          invoice_path = VALUES(invoice_path),
          invoice_number = VALUES(invoice_number)`,
      [
        row.business_id,
        row.advertisement_id,
        row.razorpay_payment_id,
        invoiceNo,
        row.owner_name,
        row.email,
        row.business_name,
        row.title,
        amount.toFixed(2),
        fileName,
        row.paid_at || new Date(),
      ]
    );

    console.log("[ad invoice] Database insert result:", insertResult);

    const [[savedInvoice]] = await pool.query(
      `SELECT *
       FROM ad_invoices
       WHERE payment_id = ?
       LIMIT 1`,
      [row.razorpay_payment_id]
    );

    console.log("[ad invoice] Saved invoice in database:", savedInvoice);

    if (!savedInvoice) {
      throw new Error("Invoice was not found after database insertion");
    }

    // Send invoice email.
    console.log("[ad invoice] Sending email to:", row.email);

    await sendAdInvoiceEmail({
      to: row.email,
      customerName: row.owner_name,
      invoicePath: filePath,
      invoiceNo,
      adTitle: row.title,
      businessName: row.business_name,
      amount: amount.toFixed(2),
    });

    // Mark email as sent.
    await pool.query(
      `UPDATE ad_invoices
       SET email_sent = 1
       WHERE payment_id = ?`,
      [row.razorpay_payment_id]
    );

    console.log("[ad invoice] Email sent successfully.");
    console.log("[ad invoice] Invoice number:", invoiceNo);
    console.log("========== CREATE AD INVOICE SUCCESS ==========\n");

  } catch (error) {
    console.error("========== AD INVOICE ERROR ==========");
    console.error(error);
    console.error(error.sqlMessage || error.message);
    console.error("======================================");

    throw error;
  }
};
