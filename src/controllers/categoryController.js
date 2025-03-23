import { find, insert, update, remove } from "../utils/dao.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await find("categories");
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await find("categories", { id: req.params.id });
    if (!category.length) return res.status(404).json({ msg: "Category not found" });

    res.status(200).json(category[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    await insert("categories", req.body);
    res.status(201).json({ msg: "Category created successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updated = await update("categories", req.body, { id: req.params.id });
    if (!updated) return res.status(400).json({ msg: "Update failed" });

    res.status(200).json({ msg: "Category updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const deleted = await remove("categories", { id: req.params.id });
    if (!deleted) return res.status(400).json({ msg: "Delete failed" });

    res.status(200).json({ msg: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
