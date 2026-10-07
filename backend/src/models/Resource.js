const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Stress Management",
        "Anxiety & Worry",
        "Sleep",
        "Academic Pressure",
        "Time Management",
        "Emotional Wellbeing",
        "Sleep & Rest",
        "Relaxation / Mindfulness",
        "Self-Care",
        "Study-Life Balance"
      ]
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    externalLink: {
      type: String,
      trim: true,
      default: ""
    },
    videoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ""
    },
    helpfulTips: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Seeded resources have no counsellor owner.
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Resource", resourceSchema);
