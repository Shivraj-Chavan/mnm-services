import { find, insert, update, remove } from "../utils/dao.js";

export const getBusinesses = async (req, res) => {
  try {
    const businesses = await find("businesses", {}, ["categories", "subcategories"]);
    res.status(200).json(businesses);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const business = await find("businesses", { id: req.params.id }, ["categories", "subcategories"]);
    if (!business.length) return res.status(404).json({ msg: "Business not found" });

    res.status(200).json(business[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const createBusiness = async (req, res) => {
  try {
    await insert("businesses", req.body);
    res.status(201).json({ msg: "Business created successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const updated = await update("businesses", req.body, { id: req.params.id });
    if (!updated) return res.status(400).json({ msg: "Update failed" });

    res.status(200).json({ msg: "Business updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    const deleted = await remove("businesses", { id: req.params.id });
    if (!deleted) return res.status(400).json({ msg: "Delete failed" });

    res.status(200).json({ msg: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
