import express from "express";
import { getAllCategoriesSubcategories, getCategories } from "../controllers/categoryController.js";

const router = express.Router();

// router.get("/", getCategories);
router.get("/", getAllCategoriesSubcategories);

export default router;
