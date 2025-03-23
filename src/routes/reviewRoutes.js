import express from "express";
import { addReview, getReviews, deleteReview } from "../controllers/reviewController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:business_id", getReviews);
router.post("/", authenticateUser, addReview);
router.delete("/:id", authenticateUser, deleteReview);

export default router;
