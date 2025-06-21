import nodemailer from 'nodemailer';

export const sendOtpViaEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS, 
    },
  });

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'New Registration Form Submission',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Hello ☺️,</h2>
        <p>Your OTP for email verification is:</p>
        <h3 style="color:#ff6600;font-size:24px">${otp}</h3>
        <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
        <p>Thank you,<br/>majhinavimumbai</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending failed:", {
      message: error.message,
      stack: error.stack,
      response: error.response,
    });
    throw new Error("Failed to send OTP email");
  }
};
