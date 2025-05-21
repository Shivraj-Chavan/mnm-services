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


// dummy data
let reviews = [
  {
    _id: '1',
    user_id: '123',
    business_id: 'a123',
    rating: 4,
    comment: 'Great service!',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '2',
    user_id: '123',
    business_id: 'b456',
    rating: 5,
    comment: 'Excellent experience!',
    createdAt: new Date().toISOString(),
  },
];

// GET /:business_id — get all reviews for a business
export const getReviews = (req, res) => {
  const { business_id } = req.params;
  console.log('Fetching reviews for business:', business_id);
  const businessReviews = reviews.filter(r => r.business_id === business_id);
  res.status(200).json(businessReviews);
};

// POST / — add a review
export const addReview = (req, res) => {
  const { user_id, business_id, rating, comment } = req.body;
  console.log('Received Review:', { user_id, business_id, rating, comment });
                                        
  const newReview = {
    _id: Date.now().toString(),
    user_id,
    business_id,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  reviews.push(newReview);

  res.status(201).json({
    msg: 'Review added successfully',
    review: newReview,
  });
};

// DELETE /:id — delete a review by id
export const deleteReview = (req, res) => {
  const { id } = req.params;
  console.log('Deleting review with id:', id);

  const initialLength = reviews.length;
  reviews = reviews.filter(r => r._id !== id);

  if (reviews.length === initialLength) {
    return res.status(404).json({ msg: 'Review not found' });
  }

  res.status(200).json({ msg: 'Review deleted ' });
};

