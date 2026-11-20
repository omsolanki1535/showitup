import Razorpay from "razorpay";
import { config } from "../config/env.js";

// Only created when both keys are configured; otherwise payments run in demo mode.
export const razorpayInstance = config.paymentsLive
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    : null;
