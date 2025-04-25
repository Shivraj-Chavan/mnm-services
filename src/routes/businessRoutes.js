import express from "express";
import { 
  getBusinessById, 
  createBusiness, 
  updateBusiness, 
  deleteBusiness, 
  getBusinesses
} from "../controllers/businessController.js";
import { validateUser } from "../middlewares/user.js";

const router = express.Router();
router.get("/", getBusinesses); 
router.get("/:id", getBusinessById);
router.post("/",validateUser, createBusiness);
router.put("/:id", updateBusiness);
router.delete("/:id", deleteBusiness);

export default router;
