import express from "express";
import { createReview, getReviews, deleteReview, getAllReviews, getRaisedReviews, adminDeleteReview } from "../controllers/reviewController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();

router.get('/raised_reviews', getRaisedReviews);
router.get("/:business_id", getReviews);
router.get('/',validateUser,getAllReviews)
// router.get("/:userId", getReviewsByUser);
router.post("/",validateUser, createReview);
router.delete("/reviews/:id",validateUser, deleteReview);
router.delete('/:review_id',  adminDeleteReview);

export default router;
