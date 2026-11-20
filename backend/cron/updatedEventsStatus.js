import cron from "node-cron";
import axios from "axios";
import { updateStatus } from "../utils/updateStatus.js";
import { config } from "../config/env.js";

export const startCronJobs = () => {
  // Move events between upcoming → active → completed.
  cron.schedule("*/3 * * * *", async () => {
    try {
      await updateStatus();
    } catch (error) {
      console.error("Error updating event statuses:", error.message);
    }
  });

  // Free hosting tiers (e.g. Render) sleep idle services. Opt in with
  // KEEP_ALIVE=true to ping the server's own health route.
  if (config.keepAlive && process.env.SERVER_URL) {
    cron.schedule("*/10 * * * *", async () => {
      try {
        await axios.get(`${process.env.SERVER_URL}/api/start`);
      } catch (error) {
        console.error("Keep-alive ping failed:", error.message);
      }
    });
  }
};
