import db from "../config/db.js"; // Change this path to your MySQL connection file
import fs from "fs";
import path from "path";

// ============================================
// GET ALL INVOICES FOR A BUSINESS
// GET /api/advertisement-invoices/business/:businessId
// ============================================

export const getBusinessInvoices = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId || isNaN(Number(businessId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid business ID",
      });
    }

    const [invoices] = await db.query(
      `SELECT
        id,
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
        payment_date,
        created_at
      FROM ad_invoices
      WHERE business_id = ?
      ORDER BY payment_date DESC, id DESC`,
      [businessId]
    );

    return res.status(200).json({
      success: true,
      message: invoices.length
        ? "Invoice history fetched successfully"
        : "No invoices found",
      data: invoices,
    });
  } catch (error) {
    console.error("Get business invoices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice history",
      error: error.message,
    });
  }
};


// ============================================
// DOWNLOAD SINGLE INVOICE
// GET /api/advertisement-invoices/:invoiceId/download
// ============================================

export const downloadInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId || isNaN(Number(invoiceId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const [rows] = await db.query(
      `SELECT id, invoice_number, invoice_path
       FROM ad_invoices
       WHERE id = ?
       LIMIT 1`,
      [invoiceId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const invoice = rows[0];

    if (!invoice.invoice_path) {
      return res.status(404).json({
        success: false,
        message: "Invoice PDF path not found",
      });
    }

    // Use only the stored filename, not an arbitrary filesystem path.
    const fileName = path.basename(invoice.invoice_path);
    const filePath = path.join(
      process.cwd(),
      "uploads",
      "invoices",
      fileName
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Invoice PDF file does not exist",
      });
    }

    return res.download(
      filePath,
      `Invoice-${invoice.invoice_number}.pdf`,
      (error) => {
        if (error) {
          console.error("Invoice download error:", error);

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "Unable to download invoice",
            });
          }
        }
      }
    );
  } catch (error) {
    console.error("Download invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to download invoice",
      error: error.message,
    });
  }
};