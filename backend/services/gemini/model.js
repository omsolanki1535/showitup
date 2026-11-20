import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiTools } from "./tools.js";
import { config } from "../../config/env.js";

// Only created when GEMINI_API_KEY is set; the chatbot route returns 503 otherwise.
export const model = config.chatbotEnabled
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        tools: geminiTools,
    })
    : null;
