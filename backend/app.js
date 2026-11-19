import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser";

//Express Setup 
dotenv.config();
const app = express();
app.use(express.json());
const allowOrigin = [
    process.env.CLIENT_URL,
    process.env.SERVER_URL
]
const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(cookieParser());

//Razorpay Setup 
import Razorpay from "razorpay"
let razorpayInstance = null;

if (process.env.NODE_ENV !== "test") {
    razorpayInstance = new Razorpay({
        key_id : process.env.RAZORPAY_KEY,
        key_secret : process.env.RAZORPAY_KEY_SECRET
    });
}

export { razorpayInstance };

//Gemini Setup
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiTools } from "./services/gemini/tools.js";
let model = null;

if (process.env.NODE_ENV !== "test") {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
        model : "gemini-2.0-flash",
        tools : geminiTools
    });
}

export { model };


//Routes Setup
import userRouter from "./routes/user.routes.js"
app.use("/api/user" , userRouter);

import eventsRouter from "./routes/events.routes.js"
app.use("/api/events" , eventsRouter);

import paymentRouter from "./routes/payment.routes.js"
app.use("/api/payment" , paymentRouter)

import reviewRouter from "./routes/reveiw.routes.js"
app.use("/api/review" , reviewRouter);

import marketingRouter from "./routes/marketing.routes.js"
app.use("/api/marketing" , marketingRouter)

import adminRouter from "./routes/admin.routes.js"
app.use("/api/admin", adminRouter)

app.get("/api/start" , (req , res) => {
    return res.status(200).send({
        message : "Server Started",
        success : true
    })
})

export default app;
