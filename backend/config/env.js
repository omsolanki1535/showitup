import dotenv from "dotenv";

dotenv.config({ quiet: true });

const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

const splitList = (value) =>
    (value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

/**
 * Checks required settings once at startup so the server fails fast with a
 * clear message instead of crashing later inside a request.
 */
export const validateEnv = () => {
    if (isTest) return;

    const required = ["MONGO_URI", "JWT_SECRET"];
    if (isProduction) required.push("CLIENT_URL");

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}. ` +
            "Copy backend/.env.example to backend/.env and fill them in."
        );
    }

    if (isProduction && process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
};

export const config = {
    isTest,
    isProduction,
    port: Number(process.env.PORT) || 8000,
    clientOrigins: splitList(process.env.CLIENT_URL),
    // Payments run in demo mode unless both Razorpay keys are configured.
    paymentsLive: Boolean(process.env.RAZORPAY_KEY && process.env.RAZORPAY_KEY_SECRET),
    emailLive: Boolean(process.env.EMAIL && process.env.PASSWORD),
    chatbotEnabled: Boolean(process.env.GEMINI_API_KEY),
    convenienceFee: Number(process.env.CONVENIENCE_FEE ?? 50),
    keepAlive: process.env.KEEP_ALIVE === "true",
};
