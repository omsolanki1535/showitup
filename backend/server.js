import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { config, validateEnv } from "./config/env.js";
import { connectDB } from "./utils/connectDB.js";
import { setIO } from "./utils/socket.js";
import app from "./app.js";
import { startCronJobs } from "./cron/updatedEventsStatus.js";

try {
    validateEnv();
} catch (error) {
    console.error(`\n[startup] ${error.message}\n`);
    process.exit(1);
}

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: config.clientOrigins.length ? config.clientOrigins : true,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
setIO(io);

io.on("connection", (socket) => {
    // Join event room for seat updates
    socket.on("join-event", (eventId) => {
        socket.join(`event-${eventId}`);
    });

    socket.on("leave-event", (eventId) => {
        socket.leave(`event-${eventId}`);
    });

    // Broadcast seat selection to everyone else looking at the same event
    socket.on("select-seat", ({ eventId, seatLabel, userId } = {}) => {
        socket.to(`event-${eventId}`).emit("seat-selected", {
            seatLabel,
            userId,
            timestamp: new Date(),
        });
    });

    socket.on("deselect-seat", ({ eventId, seatLabel, userId } = {}) => {
        socket.to(`event-${eventId}`).emit("seat-deselected", {
            seatLabel,
            userId,
            timestamp: new Date(),
        });
    });
});

const start = async () => {
    await connectDB();
    server.listen(config.port, () => {
        console.log(`Server listening on ${config.port}`);
        console.log(
            `Modes: payments=${config.paymentsLive ? "razorpay" : "demo"}, ` +
            `email=${config.emailLive ? "smtp" : "demo"}, ` +
            `chatbot=${config.chatbotEnabled ? "gemini" : "disabled"}`
        );
    });
    startCronJobs();
};

const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();

export { io };
