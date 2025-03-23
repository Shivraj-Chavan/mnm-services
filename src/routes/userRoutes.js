import express from "express";
import { getUserProfile, updateUserProfile, deleteUser } from "../controllers/userController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", validateUser, registerUser);
router.get("/profile", authenticateUser, getUserProfile);
router.put("/profile", authenticateUser, updateUserProfile);
router.delete("/profile", authenticateUser, deleteUser);

export default router;
