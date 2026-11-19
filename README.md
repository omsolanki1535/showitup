# showitup — Event Discovery & Ticketing Platform

This version contains the customized showitup branding/theme and local OTP-demo improvements. See `SHOWITUP_SETUP.md` for setup instructions.

# HostMyShow - Event Management & Ticketing Platform

## Overview

**HostMyShow** is a full-featured event management and ticket booking platform built using the MERN stack. It allows users to explore and book events, while organizers can create and manage their shows. Admins oversee event approvals, ensuring a smooth and trusted experience. The platform includes OTP-based login, role-based access, and a clean, responsive UI using modern design principles like glassmorphism.

---

## Table of Contents

1. [Tech Stack](#tech-stack)  
2. [Features](#features)  
3. [Installation and Setup](#installation-and-setup)  
4. [Project Structure](#project-structure)  
5. [Environment Variables](#environment-variables)  
6. [Known Issues](#known-issues)  
7. [Future Improvements](#future-improvements)  
8. [About Me](#about-me)  
9. [License](#license)

---

## Architecture
<img width="7836" height="5779" alt="hostmysho (1)" src="https://github.com/user-attachments/assets/975c2bd6-16df-4ec5-9ab7-acb59fd7b87a" />


## Tech Stack

### Frontend
- React + Vite
- Tailwind CSS (with glassmorphism UI)
- React Router DOM
- Context API for state management
- Lucide React, Radix UI, shadcn/ui

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Axios for HTTP requests

---

## Features

### User
- Browse upcoming events
- Book tickets
- OTP-based login
- View personal bookings

### Organizer
- Register and login as an organizer
- Create and manage event listings
- View booking statistics

### Admin
- Approve or reject new events
- View and manage platform activity

### Common Features
- Role-based routing and dashboard
- Glassmorphism UI with responsive layout
- Toast notifications and smooth navigation

---


## Installation and Setup

### Prerequisites

- Node.js (v14+)
- MongoDB Atlas or local instance

### Steps

1. **Clone the Repository**

```bash
git clone https://github.com/sakshinehe/hostmyshow.git
cd hostmyshow

cd backend
npm install
npm run dev
```

## Attribution and academic integrity

This project is adapted from a mentor-provided MERN event-ticketing codebase. It is not presented as an independently authored clone. Keep the mentor repository and license linked in project documentation, and document substantive changes made for this version.

Suggested review statement: “This implementation began with a mentor-provided baseline and was customized, integrated, tested, and hardened for showitup.”

## Production setup

1. Configure MongoDB and set `MONGO_URI`.
2. Set `NODE_ENV=production`, `JWT_SECRET`, `CLIENT_URL`, and `SERVER_URL`.
3. Configure email credentials or a transactional email provider.
4. Configure Razorpay and Gemini keys only for the features you demonstrate.
5. Provision an admin account:

```powershell
cd backend
npm.cmd run create-admin -- admin@example.com "Admin Name" "A-strong-password"
```

For Vercel plus backend hosting, deploy them separately, set `VITE_API=https://<backend-domain>/api`, and set `CLIENT_URL=https://<frontend-domain>`. Never place secrets in `VITE_*` variables.
