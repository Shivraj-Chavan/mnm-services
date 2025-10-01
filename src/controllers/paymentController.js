import Razorpay from "razorpay";
import pool from "../config/db.js";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: 'rzp_live_oY6EtJcLMAna9o',
  key_secret:'qrrEwtkG9wCC0zUqFZfsnSQL',
});

// create
export const initiatePayment = async (req, res) => {
  const { plan, plan_id,amount, business_id } = req.body;
  console.log("initiatePayment request body:", req.body);
  if (!plan || !plan_id || business_id == null) {
    console.warn("Missing plan or business_id");
    return res.status(400).json({ error: "Plan and business ID are required" });
  }

  // FREE PLAN → no Razorpay order
  if (amount === 0) {
    console.log("Free plan selected. Inserting directly to DB...");

    const transactionId = `FREE-${Date.now()}`;
    try {
      const insertQuery = `
        INSERT INTO payments (business_id, plan, amount, transaction_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      console.log("Insert Query:", insertQuery);
      console.log(" Values:", [business_id, plan, 0, transactionId, "completed"]);

      await pool.execute(insertQuery, [business_id, plan, 0,  transactionId, "completed"]);
      console.log("Free plan inserted successfully.");
      return res.json({ success: true, message: "Free plan activated" });
    } catch (error) {
      console.error("DB error:", error);
      return res.status(500).json({ error: "Failed to insert free plan in DB" });
    }
  }

  // PAID PLANS → go through Razorpay
  try {
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    console.log("Razorpay order options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created:", order);

    const insertQuery = `
      INSERT INTO payments (business_id, plan, amount, transaction_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    console.log("Insert Query:", insertQuery);
    console.log("Values:", [business_id, plan_id, amount, order.id, "pending"]);
    await pool.execute(insertQuery, [business_id, plan_id, amount, order.id, "pending"]);
    console.log("Payment record inserted with pending status.");

    res.json({
      success: true,
      transactionId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: "rzp_live_oY6EtJcLMAna9o"
    });
  } catch (error) {
    console.error("Razorpay error:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};


// verify
// export const verifyPayment = async (req, res) => {
//   console.log("verifyPayment request body:", req.body);
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, business_id} = req.body;
//     console.log("Razorpay Order ID:", razorpay_order_id);
//     console.log("Razorpay Payment ID:", razorpay_payment_id);
//     console.log(" Razorpay Signature:", razorpay_signature);
//     console.log(" Business ID:", business_id);
  
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");
//       console.log("Expected Signature:", expectedSignature);
  
//     if (expectedSignature !== razorpay_signature) {
//       console.warn("Invalid signature. Payment verification failed.");
//       return res.status(400).json({ success: false, message: "Invalid signature" });
//     }
  
//     const updateQuery = `UPDATE payments SET transaction_id = ?, status = 'completed' WHERE transaction_id = ? AND business_id = ?`;
//     console.log('Updatequer',updateQuery);
//     pool.execute(updateQuery, [razorpay_payment_id, razorpay_order_id, business_id], (err, result) => {
//       if (err) {
//         console.error("DB update error:", err);
//         return res.status(500).json({ error: "Failed to update payment record" });
//       }
//       console.log("Payment record updated successfully:", result);
//       res.json({ success: true, message: "Payment verified successfully" });
//     });
//   };


// export const verifyPayment = async (req, res) => {
//   console.log("verifyPayment request body:", req.body);
  
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature, business_id } = req.body;
  
//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !business_id) {
//     return res.status(400).json({ success: false, message: "Missing required fields" });
//   }

//   // Step 1: Verify signature
//   const expectedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_SECRET)
//     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//     .digest("hex");

//   console.log("Expected Signature:", expectedSignature);

//   if (expectedSignature !== razorpay_signature) {
//     console.warn("Invalid signature. Payment verification failed.");
//     return res.status(400).json({ success: false, message: "Invalid signature" });
//   }

//   // Step 2: Update payment status
//   const updateQuery = `
//     UPDATE payments 
//     SET transaction_id = ?, status = 'completed' 
//     WHERE transaction_id = ? AND business_id = ?
//   `;

//   try {
//     const [result] = await pool.execute(updateQuery, [
//       razorpay_payment_id, // new transaction_id = payment_id
//       razorpay_order_id,   // match old transaction_id
//       business_id
//     ]);

//     console.log("Payment update result:", result);

//     if (result.affectedRows === 0) {
//       console.warn("No payment record found to update.");
//       return res.status(404).json({ success: false, message: "Payment record not found" });
//     }

//     res.json({ success: true, message: "Payment verified successfully" });
//   } catch (err) {
//     console.error("DB update error:", err);
//     res.status(500).json({ success: false, message: "Failed to update payment record" });
//   }
// };

export const verifyPayment = async (req, res) => {
  console.log("verifyPayment request body:", req.body);
  
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    business_id,
    amount,
    plan_id
  } = req.body;

  const { page = 1, limit = 10 } = req.query; // Pagination params (optional)

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !business_id) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // 1. Verify Razorpay signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  console.log("Expected Signature:", expectedSignature);
  console.log("Received Signature:", razorpay_signature);

  if (expectedSignature !== razorpay_signature) {
    console.warn("Invalid signature. Payment verification failed.");
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  try {
    // 2. Update payment record
    const updateQuery = `
      UPDATE payments 
      SET transaction_id = ?, status = 'completed' 
      WHERE transaction_id = ? AND business_id = ?
    `;
    const [updateResult] = await pool.execute(updateQuery, [
      razorpay_payment_id,
      razorpay_order_id,
      business_id
    ]);

    console.log("Payment update result:", updateResult);

    if (updateResult.affectedRows === 0) {
      console.warn("No matching payment record found to update.");
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    // 3. Save plan for the business
    if (plan_id) {
      const startDate = new Date();
      let endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
         

      const [planResult] = await pool.query(
        `INSERT INTO business_plans 
          (business_id, plan_duration, plan_price, plan_id, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          business_id,
          "",
          "10",
          plan_id,
          startDate.toISOString().slice(0, 10),
          endDate.toISOString().slice(0, 10)
        ]
      );

      console.log("Business plan saved, ID:", planResult.insertId);
    } else {
      console.warn("Plan details not provided in verification request. Plan not saved.");
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM payments`
    );
    const total = countRows[0].total;

    const [paginatedPayments] = await pool.query(
      `SELECT * FROM payments ORDER BY id DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    // 4. Success response
    res.json({ success: true, message: "Payment verified and plan activated" });
  } catch (err) {
    console.error("Error in payment verification:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

