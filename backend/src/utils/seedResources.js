const mongoose = require("mongoose");
const Resource = require("../models/Resource");

const seedResources = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    const count = await Resource.countDocuments();

    // Preserve any resources already in the database instead of reseeding them.
    if (count > 0) {
      return;
    }

    const resources = [
      {
        title: "Managing Academic Stress",
        description: "Simple techniques to reduce pressure during busy study periods.",
        category: "Academic Pressure",
        content:
          "When academic stress builds up, break tasks into small, manageable steps and protect a few short breaks during the day. Prioritise the most urgent deadlines, review what is essential, and remember that one challenging week does not define your progress. Gentle routines like planning, stretching, hydration, and brief resets can help reduce overwhelm.",
        externalLink: "",
        isActive: true
      },
      {
        title: "Sleep Reset Routine",
        description: "A few healthy habits that support better sleep on busy days.",
        category: "Sleep",
        content:
          "A consistent evening routine can help your mind settle. Reduce bright screens for the last hour before bed, keep your room cool and dark, and consider a short wind-down routine such as stretching, journaling, or breathing slowly. If racing thoughts are keeping you awake, try writing down tomorrow's tasks and letting them rest for the night.",
        externalLink: "",
        isActive: true
      },
      {
        title: "Coping with Stress in Daily Life",
        description: "Small actions that support steadier emotional wellbeing.",
        category: "Stress Management",
        content:
          "When stress spikes, focus on one small action at a time. Try a few slow breaths, a short walk, or a simple reset away from your screens. Notice what feels manageable, and avoid judging yourself for needing a break. Supportive routines and realistic expectations can help you feel more in control.",
        externalLink: "",
        isActive: true
      },
      {
        title: "Planning Your Time Without Overloading",
        description: "A practical approach to keep study time balanced and realistic.",
        category: "Time Management",
        content:
          "Set your priorities for the day, then block time for study, rest, and recovery. Aim for realistic goals rather than trying to do everything at once. If your timetable feels full, reduce it to the most important tasks first and leave space for breaks, meals, and downtime.",
        externalLink: "",
        isActive: true
      },
      {
        title: "Supporting Emotional Wellbeing",
        description: "Gentle habits that help you notice and care for your wellbeing.",
        category: "Emotional Wellbeing",
        content:
          "Taking time to notice how you feel can help you respond early and kindly. Check in with yourself throughout the day, name what is hard, and look for one supportive action such as a walk, a talk with a trusted person, or a few minutes of calm breathing. You do not need to handle every emotion alone.",
        externalLink: "",
        isActive: true
      },
      {
        title: "Managing Worry and Anxiety",
        description: "Simple ways to calm anxious thoughts and regain focus.",
        category: "Anxiety & Worry",
        content:
          "Worry often feels loudest when we are tired or overloaded. Try grounding techniques like noticing five things you can see, four you can feel, and three you can hear. Challenge one worry at a time and ask: 'What is the next helpful step I can take?' Balanced routines and supportive conversations can help reduce the pressure of constant overthinking.",
        externalLink: "",
        isActive: true
      }
    ];

    await Resource.insertMany(resources);
    return resources;
  } catch (error) {
    console.error("Resource seed error:", error.message);
    return [];
  }
};

module.exports = { seedResources };
