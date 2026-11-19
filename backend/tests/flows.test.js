import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { User } from "../models/user.model.js";
import { Event } from "../models/events.model.js";
import { Booking } from "../models/bookings.model.js";
import { Payment } from "../models/payment.model.js";

// End-to-end API tests for signup, events, payments and booking.
// Needs a disposable MongoDB database: set MONGO_URI_TEST, for example
// mongodb://127.0.0.1:27017/showitup_test. Skipped when it is not set.
const TEST_URI = process.env.MONGO_URI_TEST;
const describeDb = TEST_URI ? describe : describe.skip;

const signupAndLogin = async (email, role) => {
    const password = "password123";
    await request(app).post("/api/user/register")
        .send({ email, username: email.split("@")[0], password, role })
        .expect(200);
    const { otp } = await User.findOne({ email }).select("otp").lean();
    await request(app).post("/api/user/otp-verify").send({ email, otp }).expect(200);
    const res = await request(app).post("/api/user/login").send({ email, password }).expect(200);
    return res.headers["set-cookie"];
};

const pay = async (cookie, eventId, seats) => {
    const order = await request(app).post("/api/payment/order")
        .set("Cookie", cookie).send({ event_id: eventId, seats });
    if (order.status !== 200) return { order };
    const verify = await request(app).post("/api/payment/verify")
        .set("Cookie", cookie).send({ razorpay_order_id: order.body.data.id });
    return { order, verify, paymentId: verify.body.payment_id };
};

describeDb("Booking flows", () => {
    let organizer, attendee, attendee2, eventId;

    beforeAll(async () => {
        await mongoose.connect(TEST_URI);
        await mongoose.connection.db.dropDatabase();
        await Promise.all([User.init(), Payment.init()]);

        organizer = await signupAndLogin("org@example.com", "Organizer");
        attendee = await signupAndLogin("fan@example.com", "Attendee");
        attendee2 = await signupAndLogin("fan2@example.com", "Attendee");

        const res = await request(app).post("/api/events/add-events")
            .set("Cookie", organizer)
            .send({
                title: "Test Concert",
                description: "Live music",
                location: "Ahmedabad",
                eventType: "Concert",
                banner: "https://example.com/banner.jpg",
                eventDateTime: [new Date(Date.now() + 7 * 864e5).toISOString()],
                seats: { type: "RowColumns", value: "2x3" },
                cost: 200,
            })
            .expect(201);
        eventId = res.body.event._id;
    });

    afterAll(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
    });

    test("signup cannot create an Admin account", async () => {
        const res = await request(app).post("/api/user/register")
            .send({ email: "evil@example.com", username: "evil", password: "password123", role: "Admin" });
        expect(res.status).toBe(400);
        expect(await User.findOne({ email: "evil@example.com" })).toBeNull();
    });

    test("profile never exposes the password hash or OTP", async () => {
        const res = await request(app).get("/api/user/getUserProfile").set("Cookie", attendee).expect(200);
        expect(res.body.user.password).toBeUndefined();
        expect(res.body.user.otp).toBeUndefined();
    });

    test("events can be browsed without logging in", async () => {
        const res = await request(app).get("/api/events/get-events").expect(200);
        expect(res.body.events).toHaveLength(1);
    });

    test("attendees cannot use organizer or marketing routes", async () => {
        await request(app).get("/api/marketing/get-emails").set("Cookie", attendee).expect(403);
        await request(app).post("/api/events/add-events").set("Cookie", attendee).send({}).expect(403);
    });

    test("order price is set by the server, not the client", async () => {
        const res = await request(app).post("/api/payment/order")
            .set("Cookie", attendee)
            .send({ event_id: eventId, seats: ["A1", "A2"], amount: 1 });
        expect(res.status).toBe(200);
        expect(res.body.demo).toBe(true);
        expect(res.body.amount).toBe(2 * 200 + 50);
        expect(res.body.data.amount).toBe((2 * 200 + 50) * 100);
    });

    test("demo payment books seats once, and the payment cannot be reused", async () => {
        const { paymentId } = await pay(attendee, eventId, ["A1", "A2"]);
        expect(paymentId).toMatch(/^demo_pay_/);

        const book = await request(app).post("/api/events/book-ticket")
            .set("Cookie", attendee)
            .send({ event_id: eventId, payment_id: paymentId, paymentAmt: 1, seats: "B1,B2,B3" });
        expect(book.status).toBe(201);
        expect(book.body.booking.seats).toBe("A1,A2");
        expect(book.body.booking.paymentAmt).toBe(450);
        expect(book.body.booking.ticket_qr).toMatch(/^data:image\/png;base64,/);

        const reuse = await request(app).post("/api/events/book-ticket")
            .set("Cookie", attendee)
            .send({ event_id: eventId, payment_id: paymentId });
        expect(reuse.status).toBe(400);

        const event = await Event.findById(eventId);
        expect(event.seatMap.filter((s) => s.isBooked).map((s) => s.seatLabel).sort()).toEqual(["A1", "A2"]);
        expect(event.totalBookings).toBe(2);
        expect(event.totalRevenue).toBe(450);
    });

    test("already booked seats cannot be ordered again", async () => {
        const res = await request(app).post("/api/payment/order")
            .set("Cookie", attendee2).send({ event_id: eventId, seats: ["A1"] });
        expect(res.status).toBe(400);
    });

    test("two paid orders for the same seat produce only one booking", async () => {
        const first = await pay(attendee, eventId, ["B1"]);
        const second = await pay(attendee2, eventId, ["B1"]);

        const results = await Promise.all([
            request(app).post("/api/events/book-ticket").set("Cookie", attendee)
                .send({ event_id: eventId, payment_id: first.paymentId }),
            request(app).post("/api/events/book-ticket").set("Cookie", attendee2)
                .send({ event_id: eventId, payment_id: second.paymentId }),
        ]);
        const statuses = results.map((r) => r.status).sort();
        expect(statuses).toEqual([201, 409]);
        expect(await Booking.countDocuments({ seats: "B1" })).toBe(1);

        // The losing payment is released, not consumed.
        const loser = results[0].status === 409 ? first : second;
        const payment = await Payment.findOne({ razorpay_payment_id: loser.paymentId });
        expect(payment.status).toBe("paid");
    });

    test("organizers cannot overwrite revenue or seat maps", async () => {
        const res = await request(app).post(`/api/events/update-my-event/${eventId}`)
            .set("Cookie", organizer)
            .send({ title: "Renamed", totalRevenue: 999999, seatMap: [] });
        expect(res.status).toBe(200);
        const event = await Event.findById(eventId);
        expect(event.title).toBe("Renamed");
        expect(event.totalRevenue).toBe(450 + 250);
        expect(event.seatMap).toHaveLength(6);
    });

    test("an invalid id returns 400 instead of a server error", async () => {
        await request(app).get("/api/events/get-events/not-an-id").expect(400);
    });
});
