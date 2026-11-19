import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  eventsOrganized: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  eventsAttended: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  role: {
    type: String,
    enum: ["Attendee", "Organizer", "Admin"],
    default: "Attendee",
  },
}, {
  timestamps: true,
  // Never send password hashes or OTPs back to the client.
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      delete ret.otp;
      delete ret.otpExpires;
      return ret;
    },
  },
});
export const User = mongoose.model("User", userSchema);
