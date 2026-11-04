import express from "express";
import { validateUser, validateAdmin } from "../middlewares/auth.js"; 
import { upload } from "../middlewares/upload.js";                
import {
  createAdRequest, getMyAdRequests, adminListAdRequests,
  adminGetAdRequest, adminApproveAdRequest, adminRejectAdRequest,
} from "../controllers/adRequestController.js";

const router = express.Router();

router.get("/mine", validateUser, getMyAdRequests);
router.post("/business/:businessId", validateUser,
  upload.fields([{ name: "image_desktop", maxCount: 1 }, { name: "image_mobile", maxCount: 1 }]),
  createAdRequest);

router.get("/admin", validateAdmin, adminListAdRequests);
router.get("/admin/:id", validateAdmin, adminGetAdRequest);
router.put("/admin/:id/approve", validateAdmin, adminApproveAdRequest);
router.put("/admin/:id/reject", validateAdmin, adminRejectAdRequest);

export default router;