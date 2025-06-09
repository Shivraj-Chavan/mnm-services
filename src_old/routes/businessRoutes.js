import express from "express";
import { 
  getBusinessById, 
  createBusiness, 
  updateBusiness, 
  deleteBusiness, 
  getBusinesses,
  getBusinessBySlug,
  uploadPhotosForBusiness,
  getBusinessByUserId,
  deleteImages
} from "../controllers/businessController.js";
import { validateUser } from "../middlewares/auth.js";
import {upload} from "../middlewares/upload.js";

const router = express.Router();
router.get("/", getBusinesses); 
router.get("/s/:slug",getBusinessBySlug)
router.get("/user",validateUser, getBusinessByUserId);
router.get("/:id",validateUser, getBusinessById);
router.post("/",validateUser, createBusiness);
router.put("/:id",validateUser, updateBusiness);
router.delete("/:id",validateUser,deleteBusiness);
router.post("/:businessId/photos",upload.array("photos", 20), uploadPhotosForBusiness);
router.delete('/:id/photos',deleteImages);

export default router;
