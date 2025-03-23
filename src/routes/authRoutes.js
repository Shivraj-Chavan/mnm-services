import express from "express";
import { login, register, logout } from "../controllers/authController.js";
import { validateRegistration, validateLogin } from "../middleware/validators.js";

const router = express.Router();

router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);

export default router;
