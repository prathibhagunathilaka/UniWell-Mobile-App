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
      enum: [30],
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
