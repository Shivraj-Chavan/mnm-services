import express from "express";
import { getAllUsers } from "../controllers/userController.js";
// import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.post("/register", registerUser);
router.get("/", getAllUsers);
// router.put("/profile", updateUserProfile);
// router.delete("/profile", deleteUser);

export default router;
