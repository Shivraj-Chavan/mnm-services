import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

export const generateAdInvoice = async ({
  invoiceNo, customerName, customerEmail, customerPhone, businessName,
  adTitle, periodStart, periodEnd, amount, taxableAmount, cgst, sgst,
  paymentId, paymentDate,
}) =>
  new Promise((resolve, reject) => {
    try {
      const dir = path.join(process.cwd(), "uploads", "invoices");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `Invoice-${invoiceNo}.pdf`);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.font("Helvetica-Bold").fontSize(22).text("MazhiMumbai", { align: "center" });
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10)
        .text("+91 9619363738 | info@majhinavimumbai.com", { align: "center" });
      doc.moveDown(0.2);
      doc.text("GSTIN : 27AFPFS5307G1ZP");
      doc.moveDown(0.8);
      doc.lineWidth(1).strokeColor("#D1D5DB").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      const line = (label, value) => {
        doc.font("Helvetica-Bold").text(`${label} : `, { continued: true });
        doc.font("Helvetica").text(String(value ?? "-"));
      };

      // Invoice details
      doc.font("Helvetica-Bold").fontSize(18).text("TAX INVOICE - ADVERTISEMENT");
      doc.moveDown().fontSize(11);
      line("Invoice No", invoiceNo);
      line("Invoice Date", fmt(paymentDate));
      line("Payment ID", paymentId);
      doc.moveDown();

      // Bill to
      doc.font("Helvetica-Bold").fontSize(13).text("Bill To");
      doc.moveDown(0.5).fontSize(11);
      line("Customer", customerName);
      line("Email", customerEmail);
      if (customerPhone) line("Phone", customerPhone);
      line("Business", businessName);
      line("Banner", adTitle || "Banner");
      line("Period", `${fmt(periodStart)} - ${fmt(periodEnd)}`);
      doc.moveDown(1);

      // Table
      const left = 50, width = 500, col2 = left + 350, h = 25;
      let top = doc.y;
      const row = (label, value, opts = {}) => {
        if (opts.fill) doc.rect(left, top, width, h).fillAndStroke("#f0f0f0", "#000000");
        else doc.rect(left, top, width, h).stroke();
        doc.fillColor("black").font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(11);
        doc.text(label, left + 10, top + 7, { width: 330 });
        doc.text(value, col2 + 10, top + 7, { width: 130, align: "right" });
        top += h;
      };
      row("Description", "Amount (Rs.)", { fill: true, bold: true });
      row(`Advertisement: ${adTitle || "Banner"}`, `${taxableAmount}`);
      row("Taxable Amount", `${taxableAmount}`);
      row("CGST", `${cgst}`);
      row("SGST", `${sgst}`);
      row("Grand Total", `${amount}`, { fill: true, bold: true });

      doc.y = top + 30;
      doc.font("Helvetica").fontSize(14).fillColor("green")
        .text("PAYMENT SUCCESSFUL", { align: "center" });
      doc.fillColor("black").moveDown(2).fontSize(10)
        .text("This is a computer generated invoice and does not require a signature.", { align: "center" });
      doc.moveDown(1).fontSize(9).fillColor("gray")
        .text("Mazhimumbai, Mumbai, Maharashtra, India", { align: "center" })
        .text("Email: info@mazhimumbai.com", { align: "center" })
        .text("Phone: +91 9619363738", { align: "center" });

      doc.end();
      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });