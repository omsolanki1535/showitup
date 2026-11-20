import rateLimit from "express-rate-limit";
import { config } from "../config/env.js";

const handler = (req, res) =>
    res.status(429).send({
        success: false,
        message: "Too many requests. Please wait a few minutes and try again.",
    });

const make = (windowMinutes, limit) =>
    rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        skip: () => config.isTest,
        handler,
    });

// General ceiling for every API route.
export const apiLimiter = make(15, 1000);

// Login, registration and OTP routes are the brute-force targets.
export const authLimiter = make(15, 20);

// The chatbot calls a paid external API.
export const chatbotLimiter = make(1, 10);
