import { Router } from "express";
import { getUserProfile, login, register, verifyOtp, resendOtp, logout } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();
router.post("/register", authLimiter, register);
router.post("/otp-verify", authLimiter, verifyOtp);
router.post("/resend-otp", authLimiter, resendOtp);
router.post("/login", authLimiter, login);
router.get("/getUserProfile", authenticate, getUserProfile);
router.post("/logout", logout);
export default router;
