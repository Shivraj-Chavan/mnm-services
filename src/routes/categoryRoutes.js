import express from "express";
import { getAllCategories, addCategory, deleteCategory } from "../controllers/categoryController.js";
import { authenticateAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllCategories);
router.post("/", authenticateAdmin, addCategory);
router.delete("/:id", authenticateAdmin, deleteCategory);

export default router;
