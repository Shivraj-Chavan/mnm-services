import express from "express";
import { getAllUsers, updateUserProfile , blockUser} from "../controllers/userController.js";
// import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.post("/register", registerUser);
router.get("/", getAllUsers);
router.put("/:id/profile", updateUserProfile);
// router.delete("/profile/:id", deleteUser);
router.put('/block/:id', blockUser);


export default router;
