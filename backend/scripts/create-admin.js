import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";

const [email, username, password] = process.argv.slice(2);

if (!email || !username || !password) {
  console.error("Usage: npm run create-admin -- email username password");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.username = username;
    existing.password = passwordHash;
    existing.role = "Admin";
    existing.otp = "";
    existing.otpExpires = null;
    await existing.save();
    console.log(`Updated ${email} as an Admin account.`);
  } else {
    await User.create({
      email: email.toLowerCase(),
      username,
      password: passwordHash,
      role: "Admin",
      otp: "",
      otpExpires: null,
    });
    console.log(`Created Admin account: ${email}`);
  }
} catch (error) {
  console.error("Could not create Admin account:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
