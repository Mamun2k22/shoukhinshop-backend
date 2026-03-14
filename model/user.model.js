import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Invalid email address"],
      default: undefined,
    },
    mobile: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    googleId: { type: String, unique: true, sparse: true },
    profileImage: { type: String, default: "default-profile.png" },
    bio: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    otpExpiresAt: { type: Date },
    role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },

    // 🔑 Password for admin login
    password: { type: String, select: false }, // store hashed password
    // 🆕 Reset Password OTP
resetOtp: { type: String },
resetOtpExpiresAt: { type: Date },
resetOtpVerified: { type: Boolean, default: false },


    wholesaleApproved: { type: Boolean, default: false },
   // 🆕 Gender (optional)
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: undefined,
    },

    // 🆕 Date of birth (optional)
    dateOfBirth: {
      type: Date,
      default: undefined,
    },

    // 🆕 Address (optional)
    address: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  { timestamps: true }
);

// 🔒 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password for login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
