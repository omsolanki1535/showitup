import { Router } from "express"
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";
import { authenticateAttendee } from "../middlewares/auth.middleware.js";
const router = Router();
router.post("/order" , authenticateAttendee , createOrder );
router.post("/verify" , authenticateAttendee , verifyPayment)
export default router;