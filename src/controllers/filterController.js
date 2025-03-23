import Business from "../models/Business.js";

export const filterBusinesses = async (req, res) => {
  try {
    const { category_id, subcategory_id, city, state, minRating, search, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (category_id) filter.category_id = category_id;
    if (subcategory_id) filter.subcategory_id = subcategory_id;
    if (city) filter.city = new RegExp(city, "i");
    if (state) filter.state = new RegExp(state, "i");
    if (minRating) filter.averageRating = { $gte: parseFloat(minRating) }; 
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const businesses = await Business.find(filter)
      .populate("category_id subcategory_id owner_id")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Business.countDocuments(filter);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      businesses,
    });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
