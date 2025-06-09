import express from "express";
import { validateUser } from "../middlewares/auth.js";
import {  getAllEnquiriesForOwner, submitEnquiry } from "../controllers/enquiryController.js";
const router = express.Router();

router.post("/",validateUser, submitEnquiry);
router.get("/owner",validateUser,getAllEnquiriesForOwner)
// router.get('/:id', getSingleEnquiry);
// router.put('/:id', updateEnquiry);
// router.delete('/:id', deleteEnquiry);

export default router;