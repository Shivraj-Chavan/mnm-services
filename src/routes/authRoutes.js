import express from "express";
import { login, register, logout } from "../controllers/authController.js";
import { validateLogin, validateRegistration } from "../middlewares/validators.js";

const router = express.Router();

router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);

export default router;
