# showitup — Event Discovery & Ticketing Platform

A customized MERN event-management and ticket-booking application with attendee, organizer, authentication, event, seating, booking, review, marketing and payment flows.

## Local setup

### 1. MongoDB
Run MongoDB locally, for example:

```powershell
mongod --dbpath D:\mongodb-data
```

### 2. Backend
Copy `backend/.env.example` to `backend/.env` and set the local values:

```env
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/hostmyshow
JWT_SECRET=change_this_for_your_environment
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
EMAIL=
PASSWORD=
RAZORPAY_KEY=
RAZORPAY_KEY_SECRET=
MONGO_DB_USERNAME=
MONGO_DB_PASSWORD=
GEMINI_API_KEY=
INNGEST_SIGN_KEY=
```

Then:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

### 3. Frontend
Copy `frontend/.env.example` to `frontend/.env`, set the Razorpay test key if payment testing is required, then:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

## OTP verification
If `EMAIL` and `PASSWORD` are blank, the app runs in **local demo mode**: registration succeeds and the generated six-digit OTP is printed in the backend terminal. For real email delivery, configure an SMTP/Gmail account using an appropriate app password.

The registration dialog also supports OTP resend. OTPs expire after 15 minutes.

## Theme / branding changes
- Product name: **showitup**
- New visual direction: warm ember/coral palette instead of the original blue/purple palette.
- Updated navigation, footer, landing-page branding, ticket PDF labels and email template branding.

## Important
This package is an adapted/customized version of an existing MERN event-ticketing codebase. Review the original repository's licensing/attribution requirements before redistributing it or presenting inherited functionality as original work. Clearly document any features you personally modify, test or extend.
