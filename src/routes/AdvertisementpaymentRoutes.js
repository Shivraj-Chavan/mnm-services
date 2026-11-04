import express from "express";
import { validateUser, validateAdmin  } from "../middlewares/auth.js"; 
import { createOrder, getPublicCategoryAds,   getPublicHomepageAds, updatePaymentStatus,  getBusinessAds,  requestRenewal, getAdHistory,  adminListRenewals,adminApproveRenewal, adminRejectRenewal,razorpayWebhook, verifyPayment } from "../controllers/AdvertisementpaymentController.js";


const router = express.Router();
// /api/AdPayment/3/verifyPayment

router.post("/:id/createOrder", validateUser, createOrder);
router.post("/:id/verifyPayment", validateUser, verifyPayment);
router.post("/webhook/razorpay", razorpayWebhook);  
router.get("/business/:businessId", validateUser, getBusinessAds);
router.post("/:id/renewal-request", validateUser, requestRenewal);
router.get("/:id/history", validateUser, getAdHistory);
router.get("/renewals", validateAdmin, adminListRenewals);
router.put("/renewals/:id/approve", validateAdmin, adminApproveRenewal);
router.put("/renewals/:id/reject", validateAdmin, adminRejectRenewal);
router.put("/:id/paymentStatus", validateAdmin, updatePaymentStatus);  
router.get("/homepage", getPublicHomepageAds);
router.get("/category/:categoryId", getPublicCategoryAds);  // public

export default router;
