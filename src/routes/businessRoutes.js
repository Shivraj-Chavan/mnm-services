import express from "express";
import { 
  getBusinessById, 
  createBusiness, 
  updateBusiness, 
  deleteBusiness, 
  getBusinesses
} from "../controllers/businessController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();
router.get("/", getBusinesses); 
router.get("/:id",validateUser, getBusinessById);
router.post("/",validateUser, createBusiness);
router.put("/:id",validateUser, updateBusiness);
router.delete("/:id",validateUser,deleteBusiness);

export default router;
