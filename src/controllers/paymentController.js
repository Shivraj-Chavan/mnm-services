import Razorpay from "razorpay";
import pool from "../config/db.js";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});


// create
export const initiatePayment = async (req, res) => {
  const { plan, amount } = req.body;
  const business_id = req.user.id; 

  if (!plan || !amount) {
    return res.status(400).json({ error: "Plan and amount are required" });
  }

  try {
    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    const insertQuery = ` INSERT INTO payments (business_id, plan, amount, transaction_id, status)
      VALUES (?, ?, ?, ?, ?)`;
    
      try {
        await pool.execute(
          insertQuery,
          [business_id, plan, amount, order.id, "pending"])
    
      } catch (error) {
        if (error) {
          console.error("DB error:", error);
          return res.status(500).json({ error: "Failed to insert order in DB" });
        }
        
      }



        res.json({
          success: true,
          transactionId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID,
        });
  } catch (error) {
    console.error("Razorpay error:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

// verify
export const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, business_id} = req.body;
  
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
  
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
  
    const updateQuery = `UPDATE payments SET transaction_id = ?, status = 'paid' WHERE transaction_id = ? AND business_id = ?`;
  
    pool.execute(updateQuery, [razorpay_payment_id, razorpay_order_id, business_id], (err, result) => {
      if (err) {
        console.error("DB update error:", err);
        return res.status(500).json({ error: "Failed to update payment record" });
      }
  
      res.json({ success: true, message: "Payment verified successfully" });
    });
  };


