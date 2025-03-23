import { find, insert, update, remove } from "../utils/dao.js";

export const getSubcategories = async (req, res) => {
  try {
    const subcategories = await find("subcategories", {}, ["categories"]);
    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getSubcategoryById = async (req, res) => {
  try {
    const subcategory = await find("subcategories", { id: req.params.id }, ["categories"]);
    if (!subcategory.length) return res.status(404).json({ msg: "Subcategory not found" });

    res.status(200).json(subcategory[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const createSubcategory = async (req, res) => {
  try {
    await insert("subcategories", req.body);
    res.status(201).json({ msg: "Subcategory created successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateSubcategory = async (req, res) => {
  try {
    const updated = await update("subcategories", req.body, { id: req.params.id });
    if (!updated) return res.status(400).json({ msg: "Update failed" });

    res.status(200).json({ msg: "Subcategory updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const deleteSubcategory = async (req, res) => {
  try {
    const deleted = await remove("subcategories", { id: req.params.id });
    if (!deleted) return res.status(400).json({ msg: "Delete failed" });

    res.status(200).json({ msg: "Subcategory deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
