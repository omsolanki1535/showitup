import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import { config } from "./config/env.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";

const app = express();

// Render, Railway and similar hosts sit behind a proxy; needed for secure
// cookies and correct client IPs in the rate limiter.
if (config.isProduction) app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(cors({
    origin(origin, callback) {
        // Requests with no Origin header (curl, health checks, server-to-server).
        if (!origin) return callback(null, true);
        // In development with no CLIENT_URL configured, allow any origin.
        if (!config.isProduction && config.clientOrigins.length === 0) return callback(null, true);
        if (config.clientOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use("/api", apiLimiter);

//Routes Setup
import userRouter from "./routes/user.routes.js";
import eventsRouter from "./routes/events.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import reviewRouter from "./routes/review.routes.js";
import marketingRouter from "./routes/marketing.routes.js";
import adminRouter from "./routes/admin.routes.js";

app.use("/api/user", userRouter);
app.use("/api/events", eventsRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/review", reviewRouter);
app.use("/api/marketing", marketingRouter);
app.use("/api/admin", adminRouter);

// Lightweight liveness check used by the frontend while the backend wakes up.
app.get("/api/start", (req, res) => {
    return res.status(200).send({
        message: "Server Started",
        success: true,
    });
});

// Readiness check for hosting platforms: reports database state and which
// integrations are live versus running in demo mode.
app.get("/api/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    return res.status(dbConnected ? 200 : 503).send({
        success: dbConnected,
        status: dbConnected ? "ok" : "degraded",
        database: dbConnected ? "connected" : "disconnected",
        uptimeSeconds: Math.round(process.uptime()),
        modes: {
            payments: config.paymentsLive ? "razorpay" : "demo",
            email: config.emailLive ? "smtp" : "demo",
            chatbot: config.chatbotEnabled ? "gemini" : "disabled",
        },
    });
});

app.use("/api", (req, res) => {
    res.status(404).send({ success: false, message: "Route not found" });
});

// Central error handler: malformed JSON, oversized bodies and anything that
// escapes a controller end up here instead of leaking a stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.name === "CastError") {
        return res.status(400).send({ success: false, message: "Invalid id" });
    }
    if (err.name === "ValidationError") {
        return res.status(400).send({ success: false, message: err.message });
    }
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).send({
        success: false,
        message: status >= 500 ? "Internal Server Error" : err.message,
    });
});

export default app;
