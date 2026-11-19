import { Router } from "express";
import { authenticate, authenticateOrganizer, authenticateAttendee } from "../middlewares/auth.middleware.js";
import { chatbotLimiter } from "../middlewares/rateLimit.middleware.js";
import { bookTicket, checkSeatsAvailability, deleteMyEvent, getBookings, getEventById, getEvents, getEventSeatsAndTimings, getMyBookings, getMyEventById, getMyEvents, postEvent, updateMyEvent , getOrganizerSummary, getBookedEvents, lockSeat, unlockSeat, getSeatLocks, checkSeatsAvailabilityWithLocks } from "../controllers/events.controller.js";
import { geminiChatBot } from "../controllers/gemini.controller.js";

const router = Router();
router.get('/get-events' , getEvents);
router.get('/get-events/:id' , getEventById);
router.post('/add-events' , authenticateOrganizer , postEvent);
router.get('/get-seats-times/:id' , getEventSeatsAndTimings);
router.get('/get-my-bookings' , authenticate , getMyBookings)
router.get('/get-my-events' , authenticateOrganizer , getMyEvents);
router.get('/get-my-events/:id' , authenticateOrganizer , getMyEventById);
router.post('/update-my-event/:id' , authenticateOrganizer , updateMyEvent);
router.delete('/delete-my-event/:id' , authenticateOrganizer , deleteMyEvent);
router.get('/get-bookings' , authenticateOrganizer , getBookings);
router.get('/get-booked-events' , authenticate , getBookedEvents);
router.get('/getOrganizerSummary' ,authenticateOrganizer , getOrganizerSummary );
router.post('/check-seats' , checkSeatsAvailability);
router.post('/check-seats-with-locks' , authenticate , checkSeatsAvailabilityWithLocks);
router.post('/lock-seat' , authenticate , lockSeat);
router.post('/unlock-seat' , authenticate , unlockSeat);
router.get('/seat-locks/:eventId' , authenticate , getSeatLocks);
router.post('/book-ticket' , authenticateAttendee , bookTicket);
router.post('/ask' , chatbotLimiter , geminiChatBot)
export default router;