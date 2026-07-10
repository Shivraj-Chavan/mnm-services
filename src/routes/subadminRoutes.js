import express from 'express';
import { blockSubadmin, createSubadmin, exportSubAdminReport, getAllSubadmins, updateSubadmin } from '../controllers/subadminController.js';
import { validateAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get("/", validateAdmin,getAllSubadmins);
router.post("/", validateAdmin,createSubadmin);
router.put("/:id", validateAdmin, updateSubadmin);
// router.delete("/:id", validateAdmin, deleteSubadmin);
router.patch("/:id/block", validateAdmin, blockSubadmin);
router.get("/export-actions",validateAdmin,exportSubAdminReport);

export default router;

