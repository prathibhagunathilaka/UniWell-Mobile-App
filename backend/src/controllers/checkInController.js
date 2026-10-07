const CheckIn = require("../models/CheckIn");

const moodScoreMap = {
  "Very Low": 1,
  "Low": 2,
  "Okay": 3,
  "Good": 4,
  "Very Good": 5
};

const stressScoreMap = {
  // Lower reported stress maps to a higher contribution to the wellbeing score.
  "Very Low": 5,
  "Low": 4,
  "Moderate": 3,
  "High": 2,
  "Very High": 1
};

const sleepScoreMap = {
  "Very Poor": 1,
  "Poor": 2,
  "Okay": 3,
  "Good": 4,
  "Very Good": 5
};

const studyCopingScoreMap = {
  "Very Difficult": 1,
  "Difficult": 2,
  "Okay": 3,
  "Well": 4,
  "Very Well": 5
};

const calculateWellbeing = ({ mood, stressLevel, sleepQuality, studyCoping }) => {
  const values = [
    moodScoreMap[mood],
    stressScoreMap[stressLevel],
    sleepScoreMap[sleepQuality],
    studyCopingScoreMap[studyCoping]
  ];

  if (values.some((value) => value === undefined)) {
    throw new Error("Invalid wellbeing input values");
  }

  const score = values.reduce((sum, value) => sum + value, 0) / values.length;

  let wellbeingLevel = "Needs Support";

  if (score >= 4.1) {
    wellbeingLevel = "Positive";
  } else if (score >= 3.1) {
    wellbeingLevel = "Doing Okay";
  } else if (score >= 2.1) {
    wellbeingLevel = "Moderate";
  }

  return {
    wellbeingScore: Number(score.toFixed(2)),
    wellbeingLevel
  };
};

const createCheckIn = async (req, res) => {
  try {
    const { mood, stressLevel, sleepQuality, studyCoping, note } = req.body;

    if (!mood || !stressLevel || !sleepQuality || !studyCoping) {
      return res.status(400).json({
        message: "Mood, stress level, sleep quality, and study coping are required."
      });
    }

    const studentId = req.user.id;

    const wellbeing = calculateWellbeing({ mood, stressLevel, sleepQuality, studyCoping });

    const checkIn = await CheckIn.create({
      studentId,
      mood,
      stressLevel,
      sleepQuality,
      studyCoping,
      note: note || "",
      wellbeingScore: wellbeing.wellbeingScore,
      wellbeingLevel: wellbeing.wellbeingLevel
    });

    return res.status(201).json({
      message: "Check-in saved successfully.",
      checkIn
    });
  } catch (error) {
    if (error.message === "Invalid wellbeing input values") {
      return res.status(400).json({
        message: "One or more responses are invalid."
      });
    }

    return res.status(500).json({
      message: "Unable to save check-in. Please try again."
    });
  }
};

const getCheckIns = async (req, res) => {
  try {
    const query = CheckIn.find({ studentId: req.user.id }).sort({ createdAt: -1 });
    if (req.query.limit !== undefined) {
      const limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Limit must be a whole number between 1 and 100." });
      }
      query.limit(limit);
    }
    const checkIns = await query.lean();

    return res.status(200).json({
      checkIns
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load your check-ins. Please try again."
    });
  }
};

const getCheckInTrend = async (req, res) => {
  try {
    const checkIns = await CheckIn.find({ studentId: req.user.id })
      .select("wellbeingScore createdAt")
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();

    return res.status(200).json({ checkIns });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load your wellbeing trend. Please try again."
    });
  }
};

const getCheckInById = async (req, res) => {
  try {
    const checkIn = await CheckIn.findOne({
      _id: req.params.id,
      studentId: req.user.id
    }).lean();

    if (!checkIn) {
      return res.status(404).json({
        message: "Check-in not found."
      });
    }

    return res.status(200).json({
      checkIn
    });
  } catch (error) {
    return res.status(400).json({
      message: "Invalid check-in ID."
    });
  }
};

module.exports = {
  createCheckIn,
  getCheckIns,
  getCheckInTrend,
  getCheckInById
};
