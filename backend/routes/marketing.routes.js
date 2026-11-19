import { Router } from "express";
import { authenticateOrganizer } from "../middlewares/auth.middleware.js";
import { getEmailList, sendBulkEmails } from "../controllers/marketing.controller.js";

// Attendee emails and bulk mail are for organizers only.
const router = Router();
router.get('/get-emails', authenticateOrganizer, getEmailList);
router.post('/bulk-email', authenticateOrganizer, sendBulkEmails);
export default router;
