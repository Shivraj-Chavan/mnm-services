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
  deleteImages, submitBusinessUpdate, uploadUpdatePhotos, getPendingUpdates, approveUpdate, rejectUpdate,
  globalSearchBusinesses
} from "../controllers/businessController.js";
import { validateUser,validateAdmin } from "../middlewares/auth.js";
import {upload} from "../middlewares/upload.js";

const router = express.Router();
router.get("/", getBusinesses); 
router.get("/s/:slug",getBusinessBySlug)
router.get("/search",globalSearchBusinesses)
router.get("/user",validateUser, getBusinessByUserId);
router.get("/:id",validateUser, getBusinessById);
router.post("/",validateUser, createBusiness);
router.put("/:id",validateUser, updateBusiness);  //Admin updates business directly
router.delete("/:id",validateUser,deleteBusiness);
router.post("/:businessId/photos",upload.array("photos", 2), uploadPhotosForBusiness);
router.delete('/:id/photos',deleteImages);

 // owner submits edit
router.put('/update/:id', validateUser, submitBusinessUpdate); //Owner submits business update
router.post('/update/:id/photos', upload.array("photos", 2), uploadUpdatePhotos); // owner uploads photos


// ADMIN routes
router.get('/admin/pending', validateUser, validateAdmin, getPendingUpdates);
router.put('/admin/approve/:id', validateUser, validateAdmin, approveUpdate);
router.delete('/admin/reject/:id', validateUser, validateAdmin, rejectUpdate);


export default router;
