import express from "express";
import { 
  getBusinessById, 
  createBusiness, 
  updateBusiness, 
  deleteBusiness, 
  getBusinesses
} from "../controllers/businessController.js";

const router = express.Router();
router.get("/", getBusinesses); 
router.get("/:id", getBusinessById);
router.post("/", createBusiness);
router.put("/:id", updateBusiness);
router.delete("/:id", deleteBusiness);

export default router;
