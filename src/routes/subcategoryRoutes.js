import express from "express";
import {
  getCategoriesWithSubcategories,
  getSubcategoriesByCategoryId} from "../controllers/subcategoryController.js";

const router = express.Router();

router.get("/", getCategoriesWithSubcategories);
router.get("/:category_id", getSubcategoriesByCategoryId);

export default router;
