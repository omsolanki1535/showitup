// Seeds demo accounts and sample events so the app can be shown end to end
// without email, payment or AI keys.
//
//   npm run seed            add demo data (keeps anything already there)
//   npm run seed -- --reset wipe demo accounts' events and bookings first
//
// Demo logins (password for all: Demo@1234):
//   admin@showitup.demo, organizer@showitup.demo, attendee@showitup.demo
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { Event } from "../models/events.model.js";
import { Booking } from "../models/bookings.model.js";
import { Payment } from "../models/payment.model.js";

const PASSWORD = "Demo@1234";
const reset = process.argv.includes("--reset");

const accounts = [
    { email: "admin@showitup.demo", username: "Demo Admin", role: "Admin" },
    { email: "organizer@showitup.demo", username: "Demo Organizer", role: "Organizer" },
    { email: "attendee@showitup.demo", username: "Demo Attendee", role: "Attendee" },
];

// Show times are in Indian Standard Time (UTC+5:30) regardless of where the
// server runs.
const days = (n, hour = 19) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    d.setUTCHours(hour - 5, -30, 0, 0);
    return d;
};

const seatGrid = (rows, cols) => {
    const seats = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 1; c <= cols; c++) {
            seats.push({ seatLabel: `${String.fromCharCode(65 + r)}${c}`, isBooked: false });
        }
    }
    return seats;
};

const sampleEvents = [
    {
        title: "Sunset Indie Live",
        description: "An evening of independent bands playing original music under the open sky.",
        location: "Ahmedabad",
        eventType: "Concert",
        banner: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200",
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600",
        eventDateTime: [days(5), days(6)],
        rows: 6, cols: 10, cost: 499,
    },
    {
        title: "Stand-up Comedy Night",
        description: "Five comics, one mic and two hours of laughs.",
        location: "Gandhinagar",
        eventType: "Comedy",
        banner: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200",
        image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600",
        eventDateTime: [days(9, 20)],
        rows: 5, cols: 8, cost: 299,
    },
    {
        title: "Tech Startup Meetup",
        description: "Founders and students share what they are building. Certificates for attendees.",
        location: "Ahmedabad",
        eventType: "Workshop",
        banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600",
        eventDateTime: [days(14, 11)],
        rows: 4, cols: 10, cost: 0,
        certificate: true,
    },
];

try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set. Copy .env.example to .env first.");
    await mongoose.connect(process.env.MONGO_URI);
    const hash = await bcrypt.hash(PASSWORD, 10);

    const users = {};
    for (const account of accounts) {
        users[account.role] = await User.findOneAndUpdate(
            { email: account.email },
            { $set: { ...account, password: hash, otp: "", otpExpires: null } },
            { upsert: true, new: true }
        );
    }
    const organizer = users.Organizer;

    if (reset) {
        const eventIds = (await Event.find({ organizer: organizer._id }).select("_id")).map((e) => e._id);
        await Booking.deleteMany({ event_id: { $in: eventIds } });
        await Payment.deleteMany({ event_id: { $in: eventIds } });
        await Event.deleteMany({ _id: { $in: eventIds } });
        organizer.eventsOrganized = [];
        users.Attendee.eventsAttended = [];
        await users.Attendee.save();
    }

    for (const sample of sampleEvents) {
        if (await Event.exists({ title: sample.title, organizer: organizer._id })) continue;
        const { rows, cols, ...fields } = sample;
        const event = await Event.create({
            ...fields,
            seats: { type: "RowColumns", value: `${rows}x${cols}` },
            seatMap: seatGrid(rows, cols),
            organizer: organizer._id,
        });
        organizer.eventsOrganized.push(event._id);
    }
    await organizer.save();

    console.log("Demo data ready. Log in with any of these (password: Demo@1234):");
    for (const account of accounts) console.log(`  ${account.role.padEnd(9)} ${account.email}`);
} catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
