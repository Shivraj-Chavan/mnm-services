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
  globalSearchBusinesses,
  getBusinessImages,
  exportBusinesses,
  getAdminActions,exportAdminActions
} from "../controllers/businessController.js";
import { validateUser,validateAdmin } from "../middlewares/auth.js";
import { dynamicPlanBasedUpload } from "../middlewares/uploadmiddleware.js";
import {upload} from "../middlewares/upload.js";
import { getBusinessPlansStatus } from "../controllers/planController.js";

const router = express.Router();
router.get("/", getBusinesses); 
router.get("/export",validateAdmin, exportBusinesses);
router.get("/exportActions",validateAdmin,exportAdminActions)
router.get('/payments',getBusinessPlansStatus);
router.get("/s/:slug",getBusinessBySlug)
router.get("/search",globalSearchBusinesses)
router.get("/user",validateUser, getBusinessByUserId);
router.get("/:id",validateUser, getBusinessById);
router.post("/",validateUser, createBusiness);
router.put("/:id",validateUser, updateBusiness);  //Admin updates business directly
router.delete("/:id",validateUser,deleteBusiness);
router.get("/:id/photos", getBusinessImages); 
router.post("/:businessId/photos",dynamicPlanBasedUpload, uploadPhotosForBusiness);
router.delete('/:id/photos',deleteImages);

 // owner submits edit
router.put('/update/:id', validateUser, submitBusinessUpdate); //Owner submits business update
router.post('/update/:id/photos', dynamicPlanBasedUpload, uploadUpdatePhotos); // owner uploads photos


// ADMIN routes
router.get('/admin/pending', validateUser, validateAdmin, getPendingUpdates);
router.put('/admin/approve/:id', validateUser, validateAdmin, approveUpdate);
router.delete('/admin/reject/:id', validateUser, validateAdmin, rejectUpdate);
router.get("/admin/actions",validateAdmin, getAdminActions);

export default router;
