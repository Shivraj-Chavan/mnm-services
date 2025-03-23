import { insert, find } from "../utils/dao.js";
import logger from "../config/logger.js";

export const createReview = async (req, res) => {
  try {
    const { user_id, business_id, rating, comment } = req.body;

    await insert("reviews", { user_id, business_id, rating, comment });

    res.status(201).json({ msg: "Review added successfully" });
  } catch (error) {
    logger.error("Create Review Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { business_id } = req.params;
    const reviews = await find("reviews", { business_id });

    res.status(200).json(reviews);
  } catch (error) {
    logger.error("Get Reviews Error", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
