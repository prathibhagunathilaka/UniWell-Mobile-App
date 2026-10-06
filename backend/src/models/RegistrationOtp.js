const mongoose = require("mongoose");

const registrationOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true
    },
    otpHash: {
      type: String,
      select: false
    },
    expiresAt: {
      type: Date
    },
    sentAt: {
      type: Date,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    verifiedAt: {
      type: Date
    },
    verificationTokenHash: {
      type: String,
      select: false
    },
    verificationTokenExpiresAt: {
      type: Date
    },
    documentExpiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

registrationOtpSchema.index({ documentExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RegistrationOtp", registrationOtpSchema);
