import express from "express";
import {
  getHomepage,
  getByCategory,
  list,
  getById,
  create,
  update,
  remove,
  toggleStatus,
  getByBusiness,
} from "../controllers/advertisemnetController.js";
import uploadAdImages from "../utils/Adupload.js";
import { validateUser, validateAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.get("/homepage", getHomepage);
router.get("/category/:categoryId", getByCategory);
router.get("/business/:businessId", validateUser, getByBusiness);

router.use(validateUser, validateAdmin);

router.get("/", list);
router.get("/:id", getById);
router.post("/", uploadAdImages, create);
router.put("/:id", uploadAdImages, update);
router.delete("/:id", remove);
router.patch("/:id/status", toggleStatus);
router.put("/:id/status", toggleStatus);

export default router;