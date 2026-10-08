const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

const publicCounsellorFields = "name qualification specialization yearsOfExperience";

const listCounsellors = async (req, res) => {
  try {
    const availableCounsellors = await Appointment.distinct("counsellorId", {
      status: "available",
      startsAt: { $gt: new Date() }
    });
    const counsellorDocs = await User.find({
      role: "counsellor",
      status: "active",
      isActive: true,
      _id: { $in: availableCounsellors }
    })
      .select(publicCounsellorFields)
      .sort({ name: 1 })
      .lean();

    // NEW: earliest open slot per counsellor so students can pick the soonest option.
    const next = await Appointment.aggregate([
      { $match: { status: "available", startsAt: { $gt: new Date() }, counsellorId: { $in: availableCounsellors } } },
      { $group: { _id: "$counsellorId", nextAvailableAt: { $min: "$startsAt" }, openSlots: { $sum: 1 } } }
    ]);
    const nextMap = new Map(next.map((n) => [String(n._id), n]));
    const counsellors = counsellorDocs.map((c) => ({
      ...c,
      nextAvailableAt: nextMap.get(String(c._id))?.nextAvailableAt || null,
      openSlots: nextMap.get(String(c._id))?.openSlots || 0
    }));

    return res.status(200).json({ counsellors });
  } catch (error) {
    console.error("Counsellor directory lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load counsellors right now." });
  }
};

const getCounsellor = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid counsellor ID." });
  }

  try {
    const counsellor = await User.findOne({
      _id: req.params.id,
      role: "counsellor",
      status: "active",
      isActive: true
    })
      .select(publicCounsellorFields)
      .lean();

    if (!counsellor) {
      return res.status(404).json({ message: "Counsellor not found." });
    }

    return res.status(200).json({ counsellor });
  } catch (error) {
    console.error("Counsellor profile lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load this counsellor right now." });
  }
};

const getAvailableSlots = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid counsellor ID." });
  }

  try {
    const counsellorExists = await User.exists({
      _id: req.params.id,
      role: "counsellor",
      status: "active",
      isActive: true
    });
    if (!counsellorExists) {
      return res.status(404).json({ message: "Counsellor not found." });
    }

    const appointments = await Appointment.find({
      counsellorId: req.params.id,
      status: "available",
      startsAt: { $gt: new Date() }
    })
      .select("startsAt durationMinutes")
      .sort({ startsAt: 1 })
      .lean();

    return res.status(200).json({ slots: appointments });
  } catch (error) {
    console.error("Counsellor availability lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load availability right now." });
  }
};

const updateCounsellorProfile = async (req, res) => {
  const { name, phoneNumber, qualification, specialization, yearsOfExperience } = req.body || {};
  const years = Number(yearsOfExperience);
  if (
    typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100 ||
    typeof phoneNumber !== "string" || phoneNumber.trim().length < 5 || phoneNumber.trim().length > 25 ||
    typeof qualification !== "string" || !qualification.trim() || qualification.trim().length > 150 ||
    typeof specialization !== "string" || !specialization.trim() || specialization.trim().length > 150 ||
    !Number.isInteger(years) || years < 0 || years > 80
  ) {
    return res.status(400).json({ message: "Enter valid profile information." });
  }

  try {
    const counsellor = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          qualification: qualification.trim(),
          specialization: specialization.trim(),
          yearsOfExperience: years
        }
      },
      { new: true, runValidators: true }
    ).select(`${publicCounsellorFields} email status phoneNumber`);

    return res.status(200).json({ counsellor });
  } catch (error) {
    console.error("Counsellor profile update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update your profile right now." });
  }
};

module.exports = {
  listCounsellors,
  getCounsellor,
  getAvailableSlots,
  updateCounsellorProfile
};
