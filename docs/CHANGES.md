# Change log

This is the work done on top of the original [HostMyShow](https://github.com/sakshinehe/hostmyshow) codebase. Each item gives the problem, then the fix.

## Earlier: rebranding and local demo
- Rebranded to **showitup** with a warm ember/coral theme, and updated the navigation, footer, landing page, ticket PDF and email templates.
- Local OTP demo mode: without email credentials, the OTP is printed in the backend terminal. OTP resend added; OTPs expire after 15 minutes.
- `npm run create-admin` script for provisioning admin accounts.

## Payments and booking
| Problem | Fix |
|---|---|
| The server crashed at startup when Razorpay keys were missing | Razorpay is created only when keys exist. Otherwise **demo payment mode** runs the full flow with simulated payments |
| The checkout amount was sent by the browser and trusted | `POST /payment/order` takes `{event_id, seats}` and calculates seats × event cost + convenience fee on the server |
| `/payment/verify` never responded when the signature was wrong | Returns 400. Uses a timing-safe comparison, and the order must belong to the logged-in user |
| One payment id could be reused for many bookings | Payments move `created → paid → used`. Booking claims the payment atomically, and the seats and amount come from the payment record |
| Two buyers could book the same seat at the same time | Seats are marked booked in one conditional `updateOne` that only matches if none of them is booked. The loser gets 409 and their payment is released |
| Bookings saved without the event title (not in the schema) | Added `event_title` to the Booking model |
| The booking route imported the server entry point to reach Socket.IO | `utils/socket.js` holds the Socket.IO instance |

## Security
| Problem | Fix |
|---|---|
| `role: "Admin"` at signup created an admin | Signup allows only Attendee or Organizer |
| Password hashes and OTPs returned by `/otp-verify` and `/getUserProfile` | `toJSON` transform on the User model, plus explicit response fields |
| Login told attackers whether an email existed | Same "Incorrect email or password" message for both cases |
| Any logged-in user could list all attendee emails and send bulk email | Marketing routes are organizer-only, and organizers can only promote their own events |
| Organizer routes only checked "logged in" | `authenticateOrganizer` / `authenticateAttendee` on the relevant routes; 403 for the wrong role |
| `update-my-event` applied the whole request body with `$set` (revenue, seat map, organizer) | Allow-list of editable fields; price can't change after bookings |
| Chatbot input was used directly as a MongoDB `$regex` | Escaped; prompt length limited; 503 when Gemini isn't configured |
| No brute-force protection | Rate limits on auth and OTP routes, the chatbot, and the API overall |
| No security headers; CORS allowed any origin if `CLIENT_URL` was empty | Helmet; in production CORS allows only `CLIENT_URL` |
| Emails could differ by case, and there was no unique index | Emails are lowercased, trimmed and unique; passwords need at least 8 characters |
| A real person's email and password were committed in `testing/*.yml` | Replaced with seeded demo accounts. The old values are still in git history, so that password should be changed |

## Reliability
- `config/env.js` validates required variables at startup and reports which integrations are live.
- `GET /api/health` reports database state and feature modes.
- Central error handler: invalid ObjectIds return 400 instead of 500, and stack traces are never sent to clients.
- The server starts listening only after MongoDB connects. It exits on DB failure so the host restarts it, and shuts down cleanly on `SIGTERM`.
- The cron job no longer logs every event every 3 minutes. Status uses the first and last show times. The keep-alive ping is opt-in (`KEEP_ALIVE=true`).
- Event times are formatted in `APP_TIMEZONE` (default Asia/Kolkata) instead of the server's UTC.
- Empty lists (no events, no bookings) return 200 with `[]` instead of 404 error toasts.
- Events, event details and seat maps can be browsed without logging in.

## Frontend
- Checkout supports demo and live payments, disables the button while processing, and shows clear errors.
- Fixed the organizer dashboard (`dummy` undefined, wrong `error.res` access, missing list keys).
- The admin dashboard shows real "today" activity and event category analytics instead of hard-coded numbers. Role change, delete, CSV export and "View Details" now work.
- Ticket PDF branding fixed (it said "Host" + "itup").
- ESLint: 15 errors down to 0. Removed an unused duplicate `components/` folder, the conflicting `pnpm-lock.yaml`, and a stray root `package-lock.json`.
- `render-build.sh` no longer deletes the lockfile before installing.

## Testing and delivery
- `tests/flows.test.js`: end-to-end API tests for signup, OTP, roles, pricing, single-use payments, concurrent seat booking and field allow-listing.
- `npm run seed`: demo admin, organizer and attendee accounts plus sample events.
- Dockerfiles for both apps, `docker-compose.yml` (MongoDB + API + nginx-served SPA on one origin), a `render.yaml` Blueprint, `vercel.json`, and SPA `_redirects`.
- GitHub Actions CI: backend tests against a MongoDB service, frontend lint and build.
- Artillery load tests updated for cookie auth and the current endpoints.
