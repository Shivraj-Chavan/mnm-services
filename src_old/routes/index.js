import express from "express";
// import authRoutes from "./authRoutes.js";
import otpRoutes from './otpRoutes.js'
import categoryRoutes from "./categoryRoutes.js";
import subcategoryRoutes from "./subcategoryRoutes.js";
import userRoutes from "./userRoutes.js";
import businessRoutes from "./businessRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import enquiryRoutes from "./enquiryRoutes.js"
// import filterRoutes from "./filterRoutes.js";
// import paymentRoutes from "./paymentRoutes.js";
// import adminRoutes from "./adminRoutes.js";

const router = express.Router();

// router.use("/auth", authRoutes);
router.use("/otp",otpRoutes)
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/subcategories", subcategoryRoutes);
router.use("/businesses", businessRoutes);
router.use("/reviews", reviewRoutes);
router.use("/enquiries",enquiryRoutes)
// router.use("/filters", filterRoutes);
// router.use("/payments", paymentRoutes);
// router.use("/admin", adminRoutes);

export default router;
