import express from "express";
import { getAllUsers, getMyProfile, updateUserProfile,createUser, globalSearchUsers, userSearchSuggestions,updatemyProfile} from "../controllers/userController.js";
import { validateAdmin, validateUser } from "../middlewares/auth.js";

const router = express.Router();

// router.post("/register", registerUser);
router.get("/", validateAdmin,getAllUsers);
router.get("/me",validateUser, getMyProfile);
router.put("/:id/profile", updateUserProfile);
// router.delete("/profile/:id", deleteUser);
// router.put('/block/:id', blockUser);
router.post("/users",validateAdmin, createUser);
router.get("/search", globalSearchUsers);
router.get("/suggestions", userSearchSuggestions);
router.put("/profile", validateUser, updatemyProfile);

export default router;
