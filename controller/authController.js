import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../model/index.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Bulk SMS API call
import bcrypt from "bcryptjs";

dotenv.config();

/* ========================
   Helpers & Config
======================== */

// ✅ Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, mobile: user.mobile, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const isValidBangladeshiNumber = (mobile) =>
  /^(?:\+88|88)?01[3-9]\d{8}$/.test(mobile);

const isValidEmail = (email) => /.+@.+\..+/.test(email);

// ✅ Nodemailer transporter (Gmail)
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // mamun180037@gmail.com
    pass: process.env.APP_PASS,   // Gmail App Password
  },
});

mailTransporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP connection error:", err);
  } else {
    console.log("✅ SMTP server is ready to take our messages");
  }
});

/* ========================
   SEND OTP (Email or Mobile)
======================== */

export const sendOtp = async (req, res) => {
  const { name, password, mobile, email } = req.body;

  // --------------------------
  // CASE 1: EMAIL OTP REQUEST
  // --------------------------
  if (email) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const message = `Your OTP code is ${otp}`;

    try {
      // 1) Email পাঠানো
      const info = await mailTransporter.sendMail({
        from: `"Zarvila" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        text: message,
        html: `<p>${message}</p>`,
      });

      console.log("📧 Email sent:", info.messageId);

      // 2) user create/update
      let user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = new User({
          name,
          email: email.toLowerCase(),
          password,
          verificationOtp: otp,
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        });
      } else {
        user.name = user.name || name;
        if (password) user.password = password;
        user.verificationOtp = otp;
        user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      }

      await user.save();

      return res
        .status(200)
        .json({ message: "OTP sent to email successfully." });
    } catch (err) {
      console.error("❌ Error sending email OTP:", err);
      return res.status(500).json({
        message: "Failed to send OTP email",
        error: err.message,
      });
    }
  }

  // --------------------------
  // CASE 2: MOBILE OTP REQUEST
  // --------------------------
  if (mobile) {
    if (!isValidBangladeshiNumber(mobile)) {
      return res
        .status(400)
        .json({ message: "Enter a valid Bangladeshi phone number." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const smsMessage = `Your OTP code is ${otp}`;

    try {
      const apiUrl = `${process.env.SMS_API_URL}?api_key=${process.env.SMS_API_KEY}&type=${process.env.SMS_TYPE}&number=${mobile}&senderid=${process.env.SMS_SENDER_ID}&message=${encodeURIComponent(
        smsMessage
      )}`;

      const response = await fetch(apiUrl, { method: "GET" });
      const result = await response.json();

      console.log("📩 Bulk SMS API Response:", result);

      if (
        result.response_code !== 202 ||
        !result.success_message?.includes("SMS Submitted Successfully")
      ) {
        return res.status(500).json({
          message: "Failed to send OTP via SMS.",
          error: result,
        });
      }

      let user = await User.findOne({ mobile });
      if (!user) {
        user = new User({
          name,
          mobile,
          password,
          verificationOtp: otp,
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
      } else {
        user.name = user.name || name;
        if (password) user.password = password;
        user.verificationOtp = otp;
        user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      }

      await user.save();

      return res.status(200).json({ message: "OTP sent successfully." });
    } catch (error) {
      console.error("❌ Error sending SMS OTP:", error);
      return res
        .status(500)
        .json({ message: "Failed to send OTP.", error });
    }
  }

  // -----------------------
  // NO EMAIL / NO MOBILE
  // -----------------------
  return res
    .status(400)
    .json({ message: "Email or Mobile is required to send OTP." });
};

/* ========================
   VERIFY OTP (Email or Mobile)
======================== */

export const verifyOtp = async (req, res) => {
  const { mobile, email, otp } = req.body;

  if ((!mobile && !email) || !otp) {
    return res
      .status(400)
      .json({ message: "Email or mobile and OTP are required." });
  }

  try {
    let user;

    if (mobile) {
      user = await User.findOne({ mobile });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.verificationOtp || String(user.verificationOtp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    user.isVerified = true;
    user.verificationOtp = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: "OTP verified successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP." });
  }
};


export const requestPasswordReset = async (req, res) => {
  const { identifier } = req.body; // email or mobile

  if (!identifier) {
    return res.status(400).json({ message: "Email or phone is required." });
  }

  const isPhone = isValidBangladeshiNumber(identifier);
  const isMail = isValidEmail(identifier);

  if (!isPhone && !isMail) {
    return res.status(400).json({ message: "Enter a valid email or Bangladeshi phone number." });
  }

  try {
    const query = isPhone
      ? { mobile: identifier.trim() }
      : { email: identifier.trim().toLowerCase() };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.isVerified) {
      return res.status(400).json({ message: "User is not verified." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    // save reset otp
    user.resetOtp = String(otp);
    user.resetOtpExpiresAt = expires;
    user.resetOtpVerified = false;
    await user.save();

    // send OTP
    if (isMail) {
      const message = `Your password reset OTP code is ${otp}`;
      await mailTransporter.sendMail({
        from: `"Zarvila" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Password Reset OTP",
        text: message,
        html: `<p>${message}</p>`,
      });

      return res.status(200).json({ message: "OTP sent to email for password reset." });
    }

    // phone
    const smsMessage = `Your password reset OTP code is ${otp}`;
    const apiUrl = `${process.env.SMS_API_URL}?api_key=${process.env.SMS_API_KEY}&type=${process.env.SMS_TYPE}&number=${user.mobile}&senderid=${process.env.SMS_SENDER_ID}&message=${encodeURIComponent(
      smsMessage
    )}`;

    const response = await fetch(apiUrl, { method: "GET" });
    const result = await response.json();

    if (
      result.response_code !== 202 ||
      !result.success_message?.includes("SMS Submitted Successfully")
    ) {
      return res.status(500).json({ message: "Failed to send OTP via SMS.", error: result });
    }

    return res.status(200).json({ message: "OTP sent to phone for password reset." });
  } catch (err) {
    console.error("❌ requestPasswordReset error:", err);
    return res.status(500).json({ message: "Failed to send reset OTP." });
  }
};

export const verifyPasswordResetOtp = async (req, res) => {
  const { identifier, otp } = req.body;

  if (!identifier || !otp) {
    return res.status(400).json({ message: "Email/phone and OTP are required." });
  }

  const isPhone = isValidBangladeshiNumber(identifier);
  const isMail = isValidEmail(identifier);

  if (!isPhone && !isMail) {
    return res.status(400).json({ message: "Enter a valid email or Bangladeshi phone number." });
  }

  try {
    const query = isPhone
      ? { mobile: identifier.trim() }
      : { email: identifier.trim().toLowerCase() };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.resetOtp || String(user.resetOtp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (!user.resetOtpExpiresAt || user.resetOtpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    user.resetOtpVerified = true;
    await user.save();

    // optional: small reset session token (simple way: return ok only)
    return res.status(200).json({ message: "Reset OTP verified successfully." });
  } catch (err) {
    console.error("❌ verifyPasswordResetOtp error:", err);
    return res.status(500).json({ message: "Failed to verify reset OTP." });
  }
};

export const resetPassword = async (req, res) => {
  const { identifier, newPassword } = req.body;

  if (!identifier || !newPassword) {
    return res.status(400).json({ message: "Email/phone and new password are required." });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const isPhone = isValidBangladeshiNumber(identifier);
  const isMail = isValidEmail(identifier);

  if (!isPhone && !isMail) {
    return res.status(400).json({ message: "Enter a valid email or Bangladeshi phone number." });
  }

  try {
    const query = isPhone
      ? { mobile: identifier.trim() }
      : { email: identifier.trim().toLowerCase() };

    const user = await User.findOne(query).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.resetOtpVerified) {
      return res.status(400).json({ message: "Please verify reset OTP first." });
    }

    // set new password (schema will hash)
    user.password = newPassword;

    // clear reset otp
    user.resetOtp = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpVerified = false;

    await user.save();

    return res.status(200).json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("❌ resetPassword error:", err);
    return res.status(500).json({ message: "Failed to reset password." });
  }
};

/* ========================
   USER LOGIN (mobile based)
======================== */
// ✅ User password login (email or mobile)
export const userPasswordLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Email/phone and password are required." });
    }

    const query = isValidBangladeshiNumber(identifier)
      ? { mobile: identifier }
      : { email: identifier.toLowerCase() };

    // password field select:false তাই আলাদা করে include করছি
    const user = await User.findOne(query).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "User is not verified. Please complete OTP verification.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ User password login error:", error);
    res.status(500).json({ message: "Failed to log in." });
  }
};

// export const userLogin = async (req, res) => {
//   const { mobile } = req.body;

//   try {
//     const user = await User.findOne({ mobile });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     if (!user.isVerified) {
//       return res
//         .status(400)
//         .json({ message: "User is not verified. Please verify your mobile number first." });
//     }

//     const token = generateToken(user);

//     res.status(200).json({
//       message: "Login successful.",
//       token,
//       user: {
//         id: user._id,
//         mobile: user.mobile,
//         isVerified: user.isVerified,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error during login:", error);
//     res.status(500).json({ message: "Failed to log in." });
//   }
// };

/* ========================
   USER LOGOUT
======================== */

export const userLogout = (req, res) => {
  try {
    res.clearCookie("token", {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Error destroying session:", err);
          return res.status(500).json({ message: "Failed to log out." });
        }
      });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Error during logout:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ========================
   ADMIN REGISTER / LOGIN
======================== */

// export const adminRegister = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     const existing = await User.findOne({ email: email.toLowerCase() });
//     if (existing) return res.status(400).json({ message: "Admin already exists" });

//     const newAdmin = new User({
//       name,
//       email: email.toLowerCase(),
//       password,         // plain (schema hash করবে)
//       role: "admin",
//       isVerified: true,
//     });

//     await newAdmin.save();

//     res.status(201).json({
//       message: "✅ Admin registered successfully",
//       admin: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role },
//     });
//   } catch (err) {
//     console.error("❌ Admin register error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const seedSuperAdmin = async () => {
  const exists = await User.findOne({ role: "superadmin" });
  if (exists) return;

  await User.create({
    name: "Super Admin",
    email: "admin@site.com",
    password: "Admin@12345",
    role: "superadmin",
    isVerified: true,
  });

  console.log("✅ Superadmin seeded");
};


export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    if (!["admin", "superadmin"].includes(admin.role)) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    if (!admin.password) {
      return res.status(400).json({
        message: "Admin password is not set. Please set password first.",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(admin);

    res.status(200).json({
      message: "✅ Admin login successful",
      token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



