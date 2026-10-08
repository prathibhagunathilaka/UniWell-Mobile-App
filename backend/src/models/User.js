const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    username: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    studentId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true
    },

    phoneNumber: {
      type: String,
      trim: true
    },

    faculty: {
      type: String,
      trim: true
    },

    year: {
      type: Number,
      min: 1,
      max: 12
    },

    qualification: {
      type: String,
      trim: true
    },

    specialization: {
      type: String,
      trim: true
    },

    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 80
    },
    // NEW: secret token for the counsellor's private calendar (.ics) subscription feed.
    calendarToken: {
      type: String,
      select: false,
      index: true,
      sparse: true
    },
    calendarLastFetchedAt: {
      type: Date,
      default: null
    },
    trustedPerson: {
      name: {
        type: String,
        trim: true,
        maxlength: 100
      },
      phoneNumber: {
        type: String,
        trim: true,
        maxlength: 25
      },
      relationship: {
        type: String,
        trim: true,
        maxlength: 60
      }
    },

    role: {
      type: String,
      enum: ["student", "counsellor", "admin"],
      default: "student"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active"
    },

    tokenVersion: {
      type: Number,
      default: 0
    },

    passwordResetOtpHash: {
      type: String,
      select: false
    },

    passwordResetOtpExpiresAt: {
      type: Date,
      select: false
    },

    passwordResetOtpSentAt: {
      type: Date,
      select: false
    },

    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    },

    passwordResetTokenHash: {
      type: String,
      select: false
    },

    passwordResetTokenExpiresAt: {
      type: Date,
      select: false
    },
    profileOtpHash: {
      type: String,
      select: false
    },

    profileOtpAction: {
      type: String,
      enum: ["update", "delete"],
      select: false
    },

    profileOtpExpiresAt: {
      type: Date,
      select: false
    },

    profileOtpSentAt: {
      type: Date,
      select: false
    },

    profileOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    },

    profileActionTokenHash: {
      type: String,
      select: false
    },

    profileActionTokenExpiresAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);