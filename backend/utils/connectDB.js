import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error("Database connection error:", error.message);
        // Without a database the API cannot serve anything useful; exit so the
        // host restarts the service instead of leaving it half-alive.
        process.exit(1);
    }
};

export { connectDB };
