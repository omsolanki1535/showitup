import dayjs from "dayjs";
import { Event } from "../models/events.model.js";

// An event is active from its first show until 3 hours after its last show.
export const updateStatus = async () => {
  const now = dayjs();
  const events = await Event.find({ status: { $ne: "completed" } }).select("eventDateTime status");

  for (const event of events) {
    if (!event.eventDateTime?.length) continue;
    const times = event.eventDateTime.map((d) => dayjs(d)).sort((a, b) => a.valueOf() - b.valueOf());
    const firstShow = times[0];
    const lastShow = times[times.length - 1];

    let newStatus = "upcoming";
    if (now.isAfter(lastShow.add(3, "hour"))) {
      newStatus = "completed";
    } else if (now.isAfter(firstShow)) {
      newStatus = "active";
    }

    if (event.status !== newStatus) {
      await Event.updateOne({ _id: event._id }, { $set: { status: newStatus } });
    }
  }
};
