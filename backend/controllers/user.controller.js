import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { mail, otpFormat } from "../utils/email.js";
import { generateOTP } from "../utils/generateOTP.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Admin accounts are created only with `npm run create-admin`, never through signup.
const SIGNUP_ROLES = ["Attendee", "Organizer"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const cookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        sameSite: isProduction ? "None" : "Lax",
        secure: isProduction,
    };
};

const register = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const role = req.body.role || "Attendee";

    if (!email || !username || !password) {
        return res.status(400).send({
            message: "All fields are required",
            success: false
        });
    }
    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).send({ message: "Please enter a valid email address", success: false });
    }
    if (String(password).length < 8) {
        return res.status(400).send({ message: "Password must be at least 8 characters", success: false });
    }
    if (!SIGNUP_ROLES.includes(role)) {
        return res.status(400).send({ message: "Role must be Attendee or Organizer", success: false });
    }

    let user = await User.findOne({ email });
    if (user) {
        return res.status(400).send({
            message: "User already exists",
            success: false
        });
    }

    const otp = generateOTP();
    const hashPassword = await bcrypt.hash(password, 10);

    user = new User({
        username: String(username).trim(),
        email,
        password: hashPassword,
        role,
        otp,
        otpExpires: Date.now() + 15 * 60 * 1000 // 15 minutes from now
    });

    await user.save();

    const content = {
        to : user.email,
        subject : "showitup OTP Verification",
        html : otpFormat(user.username , otp),
        __otp : otp
    };

    const sent = await mail(content);
    if(!sent){
        return res.status(400).send({
            message : "Problem with sending OTP",
            success : false
        })
    }
  
    return res.status(200).send({
        message: (!process.env.EMAIL || !process.env.PASSWORD) ? "OTP generated in local demo mode. Check the backend terminal." : "OTP sent to your email",
        success: true
    });
});

const verifyOtp = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!otp || !email) {
        return res.status(400).send({
            message: "OTP missing",
            success: false
        });
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp || user.otp !== String(otp) || Date.now() > user.otpExpires) {
        return res.status(400).send({
            message: "OTP not verified or expired",
            success: false
        });
    }

    user.otp = "";
    user.otpExpires = null;
    await user.save();

    return res.status(200).send({
        user: { id: user._id, email: user.email, username: user.username, role: user.role },
        message: "OTP verified. Registration successful",
        success: true
    });
});

const login = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
        return res.status(400).send({
            message: "All fields are required",
            success: false
        });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).send({
            message: "Incorrect email or password",
            success: false
        });
    }

    if (user.otp) {
        if (Date.now() > user.otpExpires) {
            await User.findOneAndDelete({ email });
            return res.status(400).send({
                message: "OTP was not verified in time. Account deleted",
                success: false
            });
        } else {
            return res.status(400).send({
                message: "Please verify your OTP to activate your account",
                success: false
            });
        }
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).send({
            message: "Incorrect email or password",
            success: false
        });
    }

    const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    return res.status(200)
        .cookie("token", token, {
            ...cookieOptions(),
            maxAge: 24 * 60 * 60 * 1000
        })
        .send({
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            message: "Login successful",
            success: true
        });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
   .populate("eventsOrganized", "title banner  status eventDateTime")
    .populate("eventsAttended", "title banner status eventDateTime")


  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user,
    message: "User profile fetched successfully",
  });
});

const logout = asyncHandler(async (req ,res) => {
    res.clearCookie("token", cookieOptions());
    return res.status(200).send({
        message : "Logout Successfull", 
        success : true
    })
})

const resendOtp = asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).send({ message: "Email is required", success: false });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User does not exist", success: false });
    if (!user.otp) return res.status(400).send({ message: "Account is already verified", success: false });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const content = {
        to: user.email,
        subject: "showitup OTP Verification",
        html: otpFormat(user.username, otp),
        __otp: otp
    };
    const sent = await mail(content);
    if (!sent) return res.status(400).send({ message: "Problem with sending OTP", success: false });

    return res.status(200).send({
        message: (!process.env.EMAIL || !process.env.PASSWORD) ? "New OTP generated. Check the backend terminal." : "New OTP sent to your email",
        success: true
    });
});

export { register, verifyOtp, resendOtp, login, logout, getUserProfile };
