const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    counsellorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    startsAt: {
      type: Date,
      required: true
    },
    slotKeys: {
      type: [Date],
      required: true,
      select: false
    },
    durationMinutes: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60, 90],
      default: 30
    },
    sessionType: {
      type: String,
      enum: ["in-person", "online", "phone"],
      default: "online"
    },
    status: {
      type: String,
      enum: ["available", "pending", "confirmed", "cancelled", "completed"],
      default: "available"
    },
    reservesSlot: {
      type: Boolean,
      default: true
    },
    // --- NEW fields ---
    shareCheckIn: {
      type: Boolean,
      default: false
    },
    cancelledBy: {
      type: String,
      enum: ["student", "counsellor", null],
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    // Post-session feedback (1-5), used only in anonymised satisfaction reporting.
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedbackAt: {
      type: Date,
      default: null
    },
    reminder24Sent: {
      type: Boolean,
      default: false
    },
    reminder1hSent: {
      type: Boolean,
      default: false
    },
    reminder5mSent: {
      type: Boolean,
      default: false
    },
    reminderOngoingSent: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

appointmentSchema.index(
  { counsellorId: 1, slotKeys: 1 },
  {
    unique: true,
    partialFilterExpression: { reservesSlot: true }
  }
);
appointmentSchema.index({ studentId: 1, startsAt: 1 });
appointmentSchema.index({ status: 1, startsAt: 1 });
appointmentSchema.index(
  { studentId: 1, slotKeys: 1 },
  {
  unique: true,
  partialFilterExpression: {
    reservesSlot: true,
    studentId: { $type: "objectId" }
  }
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
