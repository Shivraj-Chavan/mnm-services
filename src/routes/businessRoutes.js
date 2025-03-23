import express from "express";
import {
  getAllBusinesses,
  getBusinessById,
  addBusiness,
  updateBusiness,
  deleteBusiness,
} from "../controllers/businessController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllBusinesses);
router.get("/:id", getBusinessById);
router.post("/", authenticateUser, addBusiness);
router.put("/:id", authenticateUser, updateBusiness);
router.delete("/:id", authenticateUser, deleteBusiness);

export default router;
