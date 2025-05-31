import express from "express";
import { createReview, getReviews, deleteReview, getAllReviews } from "../controllers/reviewController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:business_id", getReviews);
router.get('/',validateUser,getAllReviews)
// router.get("/:userId", getReviewsByUser);
router.post("/",validateUser, createReview);
router.delete("/:review_id", deleteReview);

export default router;
