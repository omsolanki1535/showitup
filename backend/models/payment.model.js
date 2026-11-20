import mongoose from "mongoose";
const { Schema } = mongoose;

// One document per checkout attempt. The amount and seats are fixed by the
// server when the order is created, so the browser cannot change the price,
// and a payment can be used for exactly one booking.
const PaymentSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event_id: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    seats: { type: [String], required: true },
    amount: { type: Number, required: true }, // rupees
    currency: { type: String, default: "INR" },
    mode: { type: String, enum: ["razorpay", "demo"], required: true },
    status: {
        type: String,
        enum: ["created", "paid", "used"],
        default: "created",
    },
    razorpay_order_id: { type: String, required: true, unique: true },
    razorpay_payment_id: { type: String, index: true, sparse: true },
    razorpay_signature: { type: String },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export const Payment = mongoose.model("Payment", PaymentSchema);
