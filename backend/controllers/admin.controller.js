import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Event } from "../models/events.model.js";
import { Booking } from "../models/bookings.model.js";

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalOrganizers,
    totalAttendees,
    totalEvents,
    activeEvents,
    completedEvents,
    pendingEvents,
    users,
    events,
    bookings,
    usersToday,
    eventsToday,
    categories,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "Organizer" }),
    User.countDocuments({ role: "Attendee" }),
    Event.countDocuments(),
    Event.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "completed" }),
    Event.countDocuments({ status: "upcoming" }),
    User.find().sort({ createdAt: -1 }).limit(200).select("username email role createdAt otp eventsOrganized eventsAttended"),
    Event.find().sort({ createdAt: -1 }).limit(12).populate("organizer", "username email"),
    Booking.find().sort({ createdAt: -1 }).populate("user_id", "username email").populate("event_id", "title location eventDateTime"),
    User.countDocuments({ createdAt: { $gte: startOfDay } }),
    Event.countDocuments({ createdAt: { $gte: startOfDay } }),
    Event.aggregate([{ $group: { _id: "$eventType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);

  const revenueToday = bookings
    .filter((booking) => booking.createdAt >= startOfDay)
    .reduce((sum, booking) => sum + Number(booking.paymentAmt || 0), 0);

  const totalRevenue = bookings.reduce((sum, booking) => sum + Number(booking.paymentAmt || 0), 0);

  const eventStatus = {
    active: activeEvents,
    completed: completedEvents,
    pending: pendingEvents,
  };

  return res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalOrganizers,
      totalAttendees,
      totalEvents,
      totalRevenue,
      activeEvents,
      completedEvents,
      pendingEvents,
    },
    today: {
      users: usersToday,
      events: eventsToday,
      bookings: bookings.filter((booking) => booking.createdAt >= startOfDay).length,
      revenue: revenueToday,
    },
    eventCategories: categories.map((c) => ({
      name: c._id || "Other",
      count: c.count,
      value: totalEvents ? Math.round((c.count / totalEvents) * 100) : 0,
    })),
    // Expose verification status without leaking the OTP itself.
    users: users.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      verified: !u.otp,
      eventsCount: (u.eventsOrganized?.length || 0) + (u.eventsAttended?.length || 0),
    })),
    events,
    bookings,
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const allowedRoles = ["Attendee", "Organizer", "Admin"];
  const { role } = req.body;
  const { id } = req.params;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select("username email role");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.status(200).json({ success: true, user, message: "User role updated" });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ success: false, message: "You cannot delete your own account" });
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.status(200).json({ success: true, message: "User deleted" });
});
