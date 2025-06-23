// import { insert, find } from "../utils/dao.js";
// import logger from "../config/logger.js";

// export const createReview = async (req, res) => {
//   try {
//     const { user_id, business_id, rating, comment } = req.body;
//     await insert("reviews", { user_id, business_id, rating, comment });

//     res.status(201).json({ msg: "Review added successfully" });
//   } catch (error) {
//     logger.error("Create Review Error", error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

// export const getReviews = async (req, res) => {
//   try {
//     const { business_id } = req.params;
//     const reviews = await find("reviews", { business_id });

//     res.status(200).json(reviews);
//   } catch (error) {
//     logger.error("Get Reviews Error", error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };


// export default async function handler(req, res) {
//   await dbConnect();
//   const { userId } = req.query;

//   if (req.method === 'GET') {
//     try {
//       const reviews = await Review.find({ userId }).sort({ date: -1 });
//       res.status(200).json(reviews);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   }

//   if (req.method === 'DELETE') {
//     try {
//       const { reviewId } = req.body;
//       await Review.findByIdAndDelete(reviewId);
//       res.status(200).json({ message: 'Review deleted' });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   }
// }

import pool from "../config/db.js";

// Add review
export const createReview = async (req, res) => {
  try {
    console.log('Request Body:', req.body);

    const user_id = req.user?.id;
    const { business_id, rating, comment } = req.body;

    if (!user_id || !business_id) {
      return res.status(400).json({ msg: "Missing user_id or business_id" });
    }

    const created_at = new Date();
    const values = [user_id, business_id, rating, comment, created_at];

    const query = `
      INSERT INTO reviews (
        user_id, business_id, rating, comment, created_at
      ) VALUES (?, ?, ?, ?, ?);
    `;

    console.log('Insert query:', query);
    console.log('Values:', values);

    const [result] = await pool.query(query, values);

    res.status(201).json({
      msg: 'Review added successfully',
      review: {
        id: result.insertId,
        user_id,
        business_id,
        rating,
        comment,
        created_at,
      },
    });
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// GET all reviews without filtering
export const getAllReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        r.id AS review_id,
        r.user_id,   
        r.comment,
        r.rating,
        r.business_id,
        b.name,
        r.created_at
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    const [reviews] = await pool.query(query, [userId]);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get All Reviews Error:', error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


// Get all reviews for a business
export const getReviews = async (req, res) => {
  try {
    const { business_id } = req.params;

    if (!business_id) {
      return res.status(400).json({ msg: "business_id is required" });
    }
    console.log('Received business_id param:', business_id)

    const query = `SELECT * FROM reviews WHERE business_id = ? ORDER BY created_at DESC `;

    const [reviews] = await pool.query(query, [business_id]);
    console.log('Reviews fetched:', reviews);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// GET all reviews posted by a specific user (My Reviews)
// export const getReviewsByUser = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({ msg: "userId is required" });
//     }

//     // Use user_id (underscore) for column name consistency
//     const query = `SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC`;
//     const [reviews] = await pool.query(query, [userId]);

//     res.status(200).json(reviews);
//   } catch (error) {
//     console.error('Get User Reviews Error:', error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

// Delete review by id
// export const deleteReview = async (req, res) => {
//   try {
//     const { review_id } = req.params;
//     console.log('Attempting to delete review with id:', review_id);

//     const query = `DELETE FROM reviews WHERE id = ?`;
//     const [result] = await pool.query(query, [review_id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ msg: 'Review not found' });
//     }

//     res.status(200).json({ msg: 'Review deleted' });
//   } catch (error) {
//     console.error('Error deleting review:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };

// DELETE /reviews/:id
export const deleteReview = async (req, res) => {
  const { review_id } = req.params;
  const requesterId = req.user.id;

  try {
    // Get review data
    const [review] = await pool.query("SELECT * FROM reviews WHERE id = ?", [review_id]);

    if (review.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    const reviewData = review[0];

    // If the requester is the reviewer, delete directly
    if (reviewData.user_id === requesterId) {
      await pool.query("DELETE FROM reviews WHERE id = ?", [review_id]);
      return res.json({ message: "Review deleted successfully" });
    }

    // If requester is the business owner, raise request
    const [business] = await pool.query("SELECT owner_id FROM businesses WHERE id = ?", [reviewData.business_id]);

    if (business[0].owner_id === requesterId) {
      await pool.query("UPDATE reviews SET raised = 1 WHERE id = ?", [review_id]);
      return res.json({ message: "Deletion request raised to admin" });
    }

    return res.status(403).json({ message: "Unauthorized to delete this review" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getRaisedReviews = async (req, res) => {
  try {
    const [raisedReviews] = await pool.query(`
      SELECT r.*, b.name as business_name
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.raised = 1
    `);

    res.json(raisedReviews);
  } catch (error) {
    console.error("Error fetching raised reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin Delete 
export const adminDeleteReview = async (req, res) => {
  const { review_id } = req.params;

  try {
    await pool.query("DELETE FROM reviews WHERE id = ?", [review_id]);
    res.json({ message: "Review permanently deleted by admin" });
  } catch (err) {
    console.error("Admin deletion error:", err);
    res.status(500).json({ message: "Failed to delete review" });
  }
};
