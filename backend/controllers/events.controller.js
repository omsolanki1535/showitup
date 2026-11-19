import { Booking } from "../models/bookings.model.js";
import { Event } from "../models/events.model.js";
import { User } from "../models/user.model.js";
import { SeatLock } from "../models/seatLock.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import QRCode from 'qrcode';
import { confirmationFormat, mail } from "../utils/email.js";
import mongoose from 'mongoose';
import { Payment } from "../models/payment.model.js";
import { getIO } from "../utils/socket.js";

const getEvents = asyncHandler(async (req, res) => {
  let events = await Event.find({}).select(
    "-users -totalBookings -totalRevenue -certificate"
  );
  return res.status(200).send({
    events,
    message: events.length ? "Events Found" : "No Events Found",
    success: true,
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id).select(
    "-users -totalbookings -totalRevenue -certificate"
  );
  if (!event) {
    return res.status(400).send({
      message: "Event Not Found",
      success: false,
    });
  }
  return res.status(200).send({
    event,
    message: "Event Sent",
    success: true,
  });
});

const getEventSeatsAndTimings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id).select("seats seatMap eventDateTime cost");

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found.",
    });
  }

  const formattedTimings = event.eventDateTime.map((dt) => {
    const dateObj = new Date(dt);
    // Format in the venue's time zone, not the server's (hosts run in UTC).
    const timeZone = process.env.APP_TIMEZONE || "Asia/Kolkata";
    return {
      date: dateObj.toLocaleDateString("en-CA", { timeZone }),
      time: dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone,
      }),
    };
  });

  return res.status(200).json({
    seats: event.seats,
    cost : event.cost,
    seatMap: event.seatMap,
    eventDateTime: formattedTimings,
    success: true,
    message: "Event seats and timings fetched successfully",
  });
});

const getMyEvents = asyncHandler(async(req , res) => {
  const userId = req.user.id ;
  const events = await Event.find({organizer : userId}).select("-seatMap")
    return res.status(200).json({
    success: true,
    events,
    message: "Events you organized fetched successfully"
  });

});

const getMyEventById = asyncHandler(async(req , res) => {

  const userId = req.user.id ;
  const {id} = req.params ;

  const event = await Event.findOne({_id : id , organizer : userId});

  if(!event)
  {
    return res.status(404).json({
      success : false ,
      message : "Event not found"
    });
  }

  return res.status(200).json({
    success : true ,
    event ,
    message : "Event fetched successfully !"
  })
})

const postEvent = asyncHandler(async (req, res) => {
  if (req.user.role != "Organizer") {
    return res.status(400).send({
      message: "You need to create a new account for organizing events",
      success: false,
    });
  }
  const {
    title,
    description,
    location,
    eventType,
    banner,
    image ,
    eventDateTime,
    seats,
    seatMap,
    cost,
    certificate,
    special,
  } = req.body;

  if (
    !title ||
    !description ||
    !location ||
    !eventType ||
    !banner ||
    !eventDateTime ||
    !seats ||
    !cost
  ) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided.",
    });
  }

  let finalSeatMap = [];

  if (isNaN(Number(cost)) || Number(cost) < 0) {
    return res.status(400).json({ success: false, message: "Cost must be a positive number." });
  }

  if (seats.type === "RowColumns") {
    const [rows, cols] = seats.value.split("x").map(Number);

    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 26 || cols > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid RowColumns format. Use format like '10x8' (up to 26 rows and 50 columns).",
      });
    }

    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // 'A' + r
      for (let c = 1; c <= cols; c++) {
        finalSeatMap.push({ seatLabel: `${rowLabel}${c}`, isBooked: false });
      }
    }
  } else if (seats.type === "direct") {
    if (!Array.isArray(seatMap) || seatMap.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Seat map is required when seats.type is 'direct'.",
      });
    }
    finalSeatMap = seatMap.map((s) => ({ seatLabel: String(s.seatLabel), isBooked: false }));
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid seats.type. Must be 'RowColumns' or 'direct'.",
    });
  }
  const user = await User.findById(req.user.id);
  const event = await Event.create({
    title,
    description,
    location,
    eventType,
    banner,
    image,
    eventDateTime,
    seats,
    seatMap: finalSeatMap,
    cost,
    certificate,
    special,
    organizer: req.user.id,
  });

  user.eventsOrganized.push(event._id);
  await user.save();

  return res.status(201).json({
    event,
    message: "Event Created Successfully",
    success: true,
  });
});

const updateMyEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const event = await Event.findOne({ _id: id, organizer: userId });

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event Not Found or you're not authorized to edit it."
    });
  }

  // Only these fields may be edited. Seat maps, revenue, booking counts,
  // status and organizer are managed by the server.
  const editable = ['title', 'description', 'location', 'eventType', 'banner', 'image', 'eventDateTime', 'cost', 'certificate', 'special'];
  const updateData = {};
  for (const key of editable) {
    if (req.body[key] !== undefined) updateData[key] = req.body[key];
  }
  if (updateData.cost !== undefined && (isNaN(Number(updateData.cost)) || Number(updateData.cost) < 0)) {
    return res.status(400).json({ success: false, message: "Cost must be a positive number." });
  }
  if (updateData.cost !== undefined && event.totalBookings > 0 && Number(updateData.cost) !== event.cost) {
    return res.status(400).json({ success: false, message: "Ticket price cannot change after bookings have been made." });
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedEvent) {
    return res.status(404).json({
      success: false,
      message: "Event could not be updated."
    });
  }

  return res.status(200).json({
    success: true,
    event: updatedEvent,
    message: "Event Updated Successfully"
  });
});

const deleteMyEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const event = await Event.findOne({ _id: id, organizer: userId });

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found "
    });
  }

  if (event.status !== 'upcoming') {
    return res.status(400).json({
      success: false,
      message: "Only upcoming events can be deleted",
    });
  }
  const existingBookings = await Booking.find({ event_id: id });

  if (existingBookings.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Event cannot be deleted because bookings already exist",
    });
  }
  
  await Event.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
});


//Organizer
const getBookings = asyncHandler(async(req , res) => {
  const userId = req.user.id ;

  const bookings = await Booking.find({ organizer_id : userId})
  .populate("user_id" , "username email")
  .populate("event_id" , "title");

    return res.status(200).json({
    success: true,
    bookings,
    message: "Bookings fetched successfully",
  });
});

//attendee
const getMyBookings = asyncHandler(async(req , res) => {
  const userId = req.user.id ;
  const bookings = await Booking.find({ user_id: userId })
    .populate("event_id", "title eventDateTime location image eventType");


  return res.status(200).json({
    success: true,
    bookings,
    message: "Your bookings fetched successfully",
  });
})

const getOrganizerSummary = asyncHandler(async (req , res) => {
  const organizerId =  req.user.id;

  let events = await Event.find({ organizer : organizerId });
  let sum = 0;
  for(let a of events){
      sum += a.totalBookings;
  }
  const bookings = await Booking.find({ organizer_id: organizerId }).select("paymentAmt");

  let totalRevenue = 0;
  for (let b of bookings) 
  {
    totalRevenue += b.paymentAmt;
  }
  const totalActiveEvents = await Event.countDocuments({
    organizer: organizerId,
    status: "active"
  });
  const totalUsers = await User.countDocuments({
    role : "Attendee"
  })

  return res.status(200).json({
    success: true,
    message: "Dashboard stats fetched",
    counts: {
      totalBookings : sum,
      totalRevenue,
      activeShows : totalActiveEvents,
      totalUsers
    }
  });
})


const checkSeatsAvailability = asyncHandler(async (req, res) => {
  const { event_id, seats } = req.body; // seats: array of seat labels, e.g. ['A1', 'A2']

  if (!event_id || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Event ID and seats array are required."
    });
  }

  const event = await Event.findById(event_id).select("seatMap");
  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found."
    });
  }

  const seatSet = new Set(seats);
  const alreadyBooked = event.seatMap
    .filter(seatObj => seatSet.has(seatObj.seatLabel) && seatObj.isBooked)
    .map(seatObj => seatObj.seatLabel);

  if (alreadyBooked.length > 0) {
    return res.status(400).json({
      success: true,
      available: false,
      alreadyBooked,
      message: `Some seats are already booked: ${alreadyBooked.join(', ')}`
    });
  }
  return res.status(200).json({
    success: true,
    available: true,
    message: "All selected seats are available."
  });
});
  
const generateTicketQR = async (data) => {
  const qrContent = JSON.stringify(data);
  return await QRCode.toDataURL(qrContent); // base64 image
};

const bookTicket = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { event_id, booking_dateTime, payment_id } = req.body;

  if (!mongoose.isValidObjectId(event_id) || !payment_id) {
    return res.status(400).json({
      success: false,
      message: 'Event and payment are required.',
    });
  }

  // Claim the payment atomically so it can only ever produce one booking.
  // Seats and amount come from the server-priced order, not the request.
  const payment = await Payment.findOneAndUpdate(
    {
      razorpay_payment_id: String(payment_id),
      user_id,
      event_id,
      status: 'paid',
    },
    { $set: { status: 'used' } },
    { new: true }
  );
  if (!payment) {
    return res.status(400).json({
      success: false,
      message: 'Payment is not completed or has already been used',
    });
  }

  const seatList = payment.seats;
  const releasePayment = () =>
    Payment.updateOne({ _id: payment._id }, { $set: { status: 'paid' } });

  // Seats locked by someone else block the booking.
  const otherUserLocks = await SeatLock.find({
    event_id,
    seatLabel: { $in: seatList },
    expiresAt: { $gt: new Date() },
    user_id: { $ne: user_id },
  });
  if (otherUserLocks.length > 0) {
    await releasePayment();
    return res.status(400).json({
      success: false,
      message: `Seats ${otherUserLocks.map(l => l.seatLabel).join(', ')} are currently being selected by other users`,
    });
  }

  // Mark every seat booked in one atomic update. The filter only matches if
  // none of the requested seats is already booked, so two people paying for
  // the same seat at the same moment cannot both succeed.
  const update = await Event.updateOne(
    {
      _id: event_id,
      seatMap: { $not: { $elemMatch: { seatLabel: { $in: seatList }, isBooked: true } } },
    },
    {
      $set: { 'seatMap.$[seat].isBooked': true },
      $inc: { totalBookings: seatList.length, totalRevenue: payment.amount },
      $addToSet: { users: user_id },
    },
    { arrayFilters: [{ 'seat.seatLabel': { $in: seatList } }] }
  );

  if (update.modifiedCount !== 1) {
    await releasePayment();
    return res.status(409).json({
      success: false,
      message: 'One or more of these seats were just booked by someone else. Please choose different seats.',
    });
  }

  const event = await Event.findById(event_id).select('title organizer');
  const bookingTime = booking_dateTime && !isNaN(new Date(booking_dateTime)) ? new Date(booking_dateTime) : new Date();

  const qrCode = await generateTicketQR({
    event: event_id,
    user: user_id,
    seats: seatList,
    time: bookingTime,
    payment: payment.razorpay_payment_id,
  });

  const booking = await Booking.create({
    user_id,
    event_id,
    event_title: event.title,
    organizer_id: event.organizer,
    booking_dateTime: bookingTime,
    seats: seatList.join(','),
    ticket_qr: qrCode,
    payment_id: payment.razorpay_payment_id,
    paymentAmt: payment.amount,
  });

  await User.updateOne({ _id: user_id }, { $addToSet: { eventsAttended: event_id } });
  await SeatLock.deleteMany({ event_id, seatLabel: { $in: seatList } });

  const io = getIO();
  if (io) {
    io.to(`event-${event_id}`).emit('seats-booked', {
      seats: seatList,
      timestamp: new Date(),
    });
  }

  res.status(201).json({
    success: true,
    message: 'Booking successful!',
    booking,
  });

  // Send the confirmation email after responding; a mail failure must not
  // fail a booking that has already been paid for.
  try {
    const base64Data = booking.ticket_qr.split(',')[1];
    const htmlContent = confirmationFormat(
      event.title,
      booking.booking_dateTime,
      booking.seats,
      req.user.email,
      booking.ticket_qr,
      booking.payment_id,
      booking.paymentAmt
    );
    await mail({
      to: req.user.email,
      subject: 'Confirmation of Ticket',
      html: htmlContent.replace(
        '{{TICKET_QR}}',
        '<img src="cid:ticketqr" alt="Ticket QR" style="width: 200px;" />'
      ),
      attachments: [
        { filename: 'ticketqr.png', content: base64Data, encoding: 'base64', cid: 'ticketqr' },
      ],
    });
  } catch (emailError) {
    console.error('Error sending confirmation email:', emailError.message);
  }
});

const getBookedEvents = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const bookings = await Booking.find({ user_id: userId }).populate({
    path: 'event_id',
    select: 'title banner status eventDateTime'
  });

  const validEvents = bookings
    .filter(b => b.event_id)
    .map(b => b.event_id); 

  res.status(200).send({
    success: true,
    message: 'Booked events fetched successfully',
    count: validEvents.length,
    data: validEvents,
  });
});

// Seat locking mechanism
const lockSeat = asyncHandler(async (req, res) => {
  const { eventId, seatLabel } = req.body;
  const userId = req.user.id;
  const sessionId = req.sessionID || req.headers['x-session-id'] || 'unknown';

  if (!eventId || !seatLabel) {
    return res.status(400).json({
      success: false,
      message: 'Event ID and seat label are required.'
    });
  }

  try {
    // Check if seat exists and is available
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const seat = event.seatMap.find(s => s.seatLabel === seatLabel);
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Seat not found'
      });
    }

    if (seat.isBooked) {
      return res.status(400).json({
        success: false,
        message: 'Seat is already booked'
      });
    }

    // Check if seat is already locked
    const existingLock = await SeatLock.findOne({
      event_id: eventId,
      seatLabel: seatLabel
    });

    if (existingLock && existingLock.isValid()) {
      // If the lock belongs to another user, deny the request
      if (existingLock.user_id.toString() !== userId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Seat is currently being selected by another user'
        });
      }
      // If the lock belongs to the same user, extend the lock time
      existingLock.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await existingLock.save();
      return res.status(200).json({
        success: true,
        message: 'Seat lock extended successfully',
        expiresAt: existingLock.expiresAt
      });
    }

    // Remove any expired locks
    if (existingLock) {
      await SeatLock.findByIdAndDelete(existingLock._id);
    }

    // Create new lock (expires in 5 minutes)
    const lockExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await SeatLock.create({
      event_id: eventId,
      seatLabel: seatLabel,
      user_id: userId,
      expiresAt: lockExpiry,
      sessionId: sessionId
    });

    res.status(200).json({
      success: true,
      message: 'Seat locked successfully',
      expiresAt: lockExpiry
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

const unlockSeat = asyncHandler(async (req, res) => {
  const { eventId, seatLabel } = req.body;
  const userId = req.user.id;

  if (!eventId || !seatLabel) {
    return res.status(400).json({
      success: false,
      message: 'Event ID and seat label are required.'
    });
  }

  // Remove the lock
  const deletedLock = await SeatLock.findOneAndDelete({
    event_id: eventId,
    seatLabel: seatLabel,
    user_id: userId
  });

  if (!deletedLock) {
    return res.status(404).json({
      success: false,
      message: 'No active lock found for this seat'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Seat unlocked successfully'
  });
});

const getSeatLocks = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const currentUserId = req.user.id;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required.'
    });
  }

  // Get all active locks for the event
  const locks = await SeatLock.find({
    event_id: eventId,
    expiresAt: { $gt: new Date() }
  }).populate('user_id', 'username').select('seatLabel user_id lockedAt expiresAt');

  res.status(200).json({
    success: true,
    locks: locks.map(lock => ({
      seatLabel: lock.seatLabel,
      userId: lock.user_id?._id,
      userName: lock.user_id?.username,
      lockedAt: lock.lockedAt,
      expiresAt: lock.expiresAt,
      isCurrentUser: lock.user_id?._id?.toString() === currentUserId.toString()
    })),
    currentUserId,
    message: 'Active seat locks fetched successfully'
  });
});

// Enhanced seat availability check with locking
const checkSeatsAvailabilityWithLocks = asyncHandler(async (req, res) => {
  const { event_id, seats } = req.body;
  const userId = req.user.id;

  if (!event_id || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Event ID and seats array are required."
    });
  }

  try {
    const event = await Event.findById(event_id).select("seatMap");
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found."
      });
    }

    // Get active locks for this event
    const activeLocks = await SeatLock.find({
      event_id: event_id,
      expiresAt: { $gt: new Date() }
    });

    const lockedSeats = new Set(activeLocks.map(lock => lock.seatLabel));
    const seatSet = new Set(seats);
    
    const alreadyBooked = event.seatMap
      .filter(seatObj => seatSet.has(seatObj.seatLabel) && seatObj.isBooked)
      .map(seatObj => seatObj.seatLabel);

    const currentlyLocked = seats.filter(seat => 
      lockedSeats.has(seat) && 
      !activeLocks.find(lock => lock.seatLabel === seat && lock.user_id.toString() === userId.toString())
    );

    if (alreadyBooked.length > 0) {
      return res.status(400).json({
        success: true,
        available: false,
        alreadyBooked,
        message: `Some seats are already booked: ${alreadyBooked.join(', ')}`
      });
    }

    if (currentlyLocked.length > 0) {
      return res.status(400).json({
        success: true,
        available: false,
        currentlyLocked,
        message: `Some seats are currently being selected by other users: ${currentlyLocked.join(', ')}`
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      message: "All selected seats are available."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking seat availability"
    });
  }
});

export { getEvents, getEventById, postEvent, getEventSeatsAndTimings , getMyEvents , getMyEventById , updateMyEvent , deleteMyEvent , getBookings , getMyBookings , getOrganizerSummary ,  bookTicket , checkSeatsAvailability  , getBookedEvents, lockSeat, unlockSeat, getSeatLocks, checkSeatsAvailabilityWithLocks};