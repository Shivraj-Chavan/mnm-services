import express from "express";
import { getFiltersByCategory, applyFilters } from "../controllers/filterController.js";

const router = express.Router();

router.get("/:category_id", getFiltersByCategory);
router.post("/apply", applyFilters);

export default router;
