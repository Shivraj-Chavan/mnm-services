import express from "express";
import {
  getCategoriesWithSubcategories,
  getSubcategoriesByCategorySlug} from "../controllers/subcategoryController.js";

const router = express.Router();

router.get("/", getCategoriesWithSubcategories);
router.get("/:slug", getSubcategoriesByCategorySlug);

export default router;
