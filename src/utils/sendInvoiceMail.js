import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

export const sendInvoiceEmail = async ({
    to,
    customerName,
    invoicePath
}) => {
    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject: "Payment Successful - Invoice",
        html: `
            Hi ${customerName},<br><br>

            Thank you for your payment.

            Your invoice is attached.

            Regards,<br>
            'MajhiNaviMumbai Team'
        `,
        attachments: [
            {
                filename: "Invoice.pdf",
                path: invoicePath
            }
        ]
    });
};



export const sendAdInvoiceEmail = async ({
    to, customerName, invoicePath, invoiceNo, adTitle, businessName, amount,
}) => {
    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject: `Invoice ${invoiceNo} - Advertisement payment received`,
        html: `
            Hi ${customerName || "there"},<br><br>
            Thank you for your payment of Rs. ${amount} for the banner
            "<b>${adTitle || "Banner"}</b>" (${businessName}).<br><br>
            Your invoice is attached.<br><br>
            Regards,<br>
            MajhiNaviMumbai Team
        `,
        attachments: [{ filename: `Invoice-${invoiceNo}.pdf`, path: invoicePath }],
    });
};

const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const sendRenewalDecisionEmail = async ({
    to, customerName, adTitle, decision, price, startDate, endDate, reason,
}) => {
    const approved = decision === "approved";
    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject: approved
            ? "Your banner renewal is approved - please pay to go live"
            : "Your banner renewal request was not approved",
        html: approved
            ? `Hi ${esc(customerName) || "there"},<br><br>
               Your renewal for the banner "<b>${esc(adTitle)}</b>" is approved.<br>
               Period: ${esc(startDate)} to ${esc(endDate)}<br>
               Amount: Rs. ${esc(price)}<br><br>
               Please open <b>My Business</b> and click <b>Pay now</b> to make it live.<br><br>
               Regards,<br>MajhiNavimumbai Team`
            : `Hi ${esc(customerName) || "there"},<br><br>
               Your renewal request for the banner "<b>${esc(adTitle)}</b>" was not approved.<br>
               ${reason ? `Reason: ${esc(reason)}<br>` : ""}<br>
               You can send a new request from <b>My Business</b>.<br><br>
               Regards,<br>MajhiNaviMumbai Team`,
    });
};