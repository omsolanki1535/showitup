import crypto from "crypto";
import mongoose from "mongoose";
import { razorpayInstance } from "../services/razorpay.js";
import { config } from "../config/env.js";
import { Payment } from "../models/payment.model.js";
import { Event } from "../models/events.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const normalizeSeats = (seats) => {
    const list = Array.isArray(seats) ? seats : String(seats || "").split(",");
    return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
};

const timingSafeEqual = (a, b) => {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// POST /api/payment/order  { event_id, seats: ["A1","A2"] }
// Prices the order on the server from the event's cost, then creates a
// Razorpay order (live mode) or a demo order (no keys configured).
const createOrder = asyncHandler(async (req, res) => {
    const { event_id } = req.body;
    const seats = normalizeSeats(req.body.seats);

    if (!mongoose.isValidObjectId(event_id) || seats.length === 0) {
        return res.status(400).json({ success: false, message: "Event and seats are required." });
    }
    if (seats.length > 10) {
        return res.status(400).json({ success: false, message: "You can book at most 10 seats at a time." });
    }

    const event = await Event.findById(event_id).select("cost seatMap status");
    if (!event) {
        return res.status(404).json({ success: false, message: "Event not found." });
    }
    if (event.status === "completed") {
        return res.status(400).json({ success: false, message: "This event has already finished." });
    }

    const seatIndex = new Map(event.seatMap.map((s) => [s.seatLabel, s]));
    const unknown = seats.filter((s) => !seatIndex.has(s));
    const booked = seats.filter((s) => seatIndex.get(s)?.isBooked);
    if (unknown.length) {
        return res.status(400).json({ success: false, message: `Unknown seats: ${unknown.join(", ")}` });
    }
    if (booked.length) {
        return res.status(400).json({ success: false, message: `These seats are already booked: ${booked.join(", ")}` });
    }

    const amount = seats.length * Number(event.cost || 0) + config.convenienceFee;
    const amountPaise = Math.round(amount * 100);

    let orderId;
    if (razorpayInstance) {
        const order = await razorpayInstance.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt: crypto.randomBytes(10).toString("hex"),
        });
        orderId = order.id;
    } else {
        orderId = `demo_order_${crypto.randomBytes(8).toString("hex")}`;
    }

    await Payment.create({
        user_id: req.user.id,
        event_id,
        seats,
        amount,
        mode: razorpayInstance ? "razorpay" : "demo",
        razorpay_order_id: orderId,
    });

    return res.status(200).json({
        success: true,
        demo: !razorpayInstance,
        data: { id: orderId, amount: amountPaise, currency: "INR" },
        amount,
    });
});

// POST /api/payment/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Live mode checks Razorpay's HMAC signature. Demo mode marks the order paid
// with a generated payment id so the full booking flow can be shown.
const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id) {
        return res.status(400).json({ success: false, message: "Order id is required." });
    }

    const payment = await Payment.findOne({
        razorpay_order_id: String(razorpay_order_id),
        user_id: req.user.id,
    });
    if (!payment) {
        return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (payment.status !== "created") {
        return res.status(400).json({ success: false, message: "This order has already been paid." });
    }

    if (payment.mode === "razorpay") {
        if (!razorpay_payment_id || !razorpay_signature || !config.paymentsLive) {
            return res.status(400).json({ success: false, message: "Payment details are missing." });
        }
        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${payment.razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
        if (!timingSafeEqual(expected, razorpay_signature)) {
            return res.status(400).json({ success: false, message: "Payment verification failed." });
        }
        payment.razorpay_payment_id = razorpay_payment_id;
        payment.razorpay_signature = razorpay_signature;
    } else {
        payment.razorpay_payment_id = `demo_pay_${crypto.randomBytes(8).toString("hex")}`;
        payment.razorpay_signature = "demo";
    }

    payment.status = "paid";
    await payment.save();

    return res.status(200).json({
        success: true,
        message: "Payment successful",
        payment_id: payment.razorpay_payment_id,
    });
});

export { createOrder, verifyPayment };
