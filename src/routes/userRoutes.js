import express from "express";
import { getAllUsers, getMyProfile, updateUserProfile,createUser } from "../controllers/userController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();

// router.post("/register", registerUser);
router.get("/", getAllUsers);
router.get("/me",validateUser, getMyProfile);
router.put("/:id/profile", updateUserProfile);
// router.delete("/profile/:id", deleteUser);
// router.put('/block/:id', blockUser);
router.post("/users", createUser);


export default router;
