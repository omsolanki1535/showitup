# Deployment guide

ShowItUp has two parts: a Node.js API (`backend/`) and a static React app (`frontend/`). Both need a MongoDB database. Every third-party integration is optional. When its keys are missing, the feature runs in **demo mode**, so the whole app can be deployed with only a database.

| Integration | Keys | Without keys |
|---|---|---|
| Razorpay payments | `RAZORPAY_KEY`, `RAZORPAY_KEY_SECRET` | Demo payments: orders are priced on the server and approved instantly, so bookings, QR tickets and revenue still work |
| Gmail OTP and ticket emails | `EMAIL`, `PASSWORD` (Gmail app password) | The OTP is printed in the backend logs |
| Gemini chatbot | `GEMINI_API_KEY` | The chatbot replies that it is not configured |

Check which modes are active at any time with `GET /api/health`.

---

## Option 1: Docker Compose (any machine with Docker)

This is the fastest way to run the full stack, for example on a laptop for a demo or on a single VPS.

```bash
docker compose up --build -d
docker compose exec backend npm run seed
```

Open <http://localhost:8080>. nginx serves the React app and proxies `/api` and `/socket.io` to the API, so everything runs on one origin. To enable an integration, export its keys before `docker compose up` (for example `export RAZORPAY_KEY=...`), or put them in a `.env` file next to `docker-compose.yml`.

For a public server, put HTTPS in front (Caddy, Traefik or a cloud load balancer), set `CLIENT_URL` and `SERVER_URL` to the public URL, and remove `COOKIE_SECURE: "false"`.

---

## Option 2: Render + MongoDB Atlas (free tiers)

### 1. Create the database
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free **M0** cluster.
2. **Database Access**: add a user with a strong password.
3. **Network Access**: allow `0.0.0.0/0` (Render's outbound IPs are not fixed on the free tier).
4. **Connect > Drivers**: copy the connection string and add a database name, for example
   `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/showitup?retryWrites=true&w=majority`.

### 2. Deploy with the Blueprint
1. Push this repository to GitHub.
2. In [Render](https://render.com): **New > Blueprint**, then pick the repository. Render reads `render.yaml` and creates two services: `showitup-api` (Node) and `showitup-web` (static site).
3. Fill in the values it asks for:

| Service | Variable | Value |
|---|---|---|
| showitup-api | `MONGO_URI` | Your Atlas connection string |
| showitup-api | `CLIENT_URL` | `https://showitup-web.onrender.com` (your web URL) |
| showitup-api | `SERVER_URL` | `https://showitup-api.onrender.com` (your API URL) |
| showitup-web | `VITE_API` | `https://showitup-api.onrender.com/api` |

`JWT_SECRET` is generated automatically. Leave the optional keys empty for demo mode.

4. When the API is live, open its **Shell** tab and run `npm run seed` to create the demo accounts and events.
5. If you renamed services, update `CLIENT_URL` and `VITE_API` to the real URLs and redeploy both.

### Notes
- Free Render services sleep after 15 minutes idle. `KEEP_ALIVE=true` (set by the Blueprint) pings the API every 10 minutes. The frontend also shows a "Backend is starting" screen while it wakes up.
- The frontend and API are on different domains, so the login cookie is sent as `SameSite=None; Secure`. This needs HTTPS, which Render provides.

---

## Option 3: Vercel (frontend) + any Node host (API)

- **Frontend on Vercel**: import the repo, set **Root Directory** to `frontend`, and add the `VITE_API` environment variable. `frontend/vercel.json` handles client-side routing.
- **API**: any Node 20+ host (Render, Railway, Fly.io, a VPS). Use `npm ci --omit=dev` to build and `node server.js` to start, with the environment variables from `backend/.env.example`.

---

## Production checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is at least 32 random characters (the server refuses to start otherwise)
- [ ] `CLIENT_URL` is exactly the frontend origin, with no trailing slash (CORS allows only these origins)
- [ ] `MONGO_URI` points to a database with authentication
- [ ] Create a real admin account with `npm run create-admin -- you@example.com "Your Name" "a-strong-password"`
- [ ] Don't run `npm run seed` on a public deployment unless you want the demo accounts there
- [ ] Never put secrets in `VITE_*` variables. They are bundled into public JavaScript. Only the Razorpay **key id** belongs there.
- [ ] `GET /api/health` returns `"status": "ok"`

## Built-in security

- Helmet security headers, `x-powered-by` disabled
- Rate limits: 20 requests per 15 minutes on login, signup and OTP routes, 10 per minute on the chatbot, and 1,000 per 15 minutes overall
- httpOnly JWT cookie; password hashes and OTPs are never returned by the API
- Role checks on every organizer, attendee, marketing and admin route; Admin can't be chosen at signup
- Server-side order pricing, single-use payments and atomic seat booking
- Required environment variables are checked at startup; there is a central error handler, and the server shuts down cleanly on `SIGTERM`
