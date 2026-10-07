const mongoose = require("mongoose");

const checkInSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    mood: {
      type: String,
      required: true,
      enum: ["Very Low", "Low", "Okay", "Good", "Very Good"]
    },
    stressLevel: {
      type: String,
      required: true,
      enum: ["Very Low", "Low", "Moderate", "High", "Very High"]
    },
    sleepQuality: {
      type: String,
      required: true,
      enum: ["Very Poor", "Poor", "Okay", "Good", "Very Good"]
    },
    studyCoping: {
      type: String,
      required: true,
      enum: ["Very Difficult", "Difficult", "Okay", "Well", "Very Well"]
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    wellbeingScore: {
      // Save the calculated result with the answers to preserve each check-in's snapshot.
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    wellbeingLevel: {
      type: String,
      required: true,
      enum: ["Needs Support", "Moderate", "Doing Okay", "Positive"]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("CheckIn", checkInSchema);
