import { Router } from "express";
import { getUserProfile, login, register, verifyOtp, resendOtp , logout } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/register" , register);
router.post("/otp-verify" , verifyOtp);
router.post("/resend-otp" , resendOtp);
router.post("/login" , login);
router.get("/getUserProfile" , authenticate ,  getUserProfile);
router.post('/logout' , logout)
export default router;