const mongoose = require("mongoose");

// In-app notification (NEW). Used for appointment reminders (FR3) and
// booking-sync confirmations (FR4). Shared by students and counsellors.
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        "booking_created",
        "booking_confirmed",
        "booking_cancelled",
        "booking_completed",
        "reminder_24h",
        "reminder_1h",
        "reminder_5m",
        "session_ongoing",
        "system"
      ]
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 400 },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null
    },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
