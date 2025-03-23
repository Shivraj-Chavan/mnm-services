import Business from "../models/Business.js";

export const getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().populate("category_id subcategory_id owner_id");
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).populate("category_id subcategory_id owner_id");
    if (!business) return res.status(404).json({ msg: "Business not found" });
    res.json(business);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const addBusiness = async (req, res) => {
  try {
    const { name, category_id, subcategory_id, address, city, state, phone, email, description } = req.body;
    const business = new Business({ owner_id: req.user.id, name, category_id, subcategory_id, address, city, state, phone, email, description });
    await business.save();
    res.json({ msg: "Business added successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const updatedBusiness = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedBusiness);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    await Business.findByIdAndDelete(req.params.id);
    res.json({ msg: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
