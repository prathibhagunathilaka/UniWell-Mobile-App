const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

const allowedSessionTypes = ["in-person", "online", "phone"];

const createAvailability = async (req, res) => {
  const startsAt = new Date(req.body?.startsAt);
  const durationMinutes = Number(req.body?.durationMinutes || 30);
  if (
    !Number.isFinite(startsAt.getTime()) ||
    startsAt <= new Date() ||
    startsAt > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) ||
    durationMinutes !== 30 ||
    startsAt.getUTCMinutes() % 15 !== 0 ||
    startsAt.getUTCSeconds() !== 0 ||
    startsAt.getUTCMilliseconds() !== 0
  ) {
    return res.status(400).json({ message: "Choose a future start time on a 30-minute boundary." });
  }

  try {
    const appointment = await Appointment.create({
      counsellorId: req.user.id,
      startsAt,
      durationMinutes,
      slotKeys: [
        new Date(startsAt.getTime()),
        new Date(startsAt.getTime() + 15 * 60 * 1000)
      ],
      status: "available"
    });
    return res.status(201).json({ slot: appointment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This time overlaps your existing availability or appointment." });
    }
    console.error("Counsellor availability creation failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to save availability right now." });
  }
};

const deleteAvailability = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid availability ID." });
  }
  try {
    const slot = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        counsellorId: req.user.id,
        status: "available"
      },
      { $set: { status: "cancelled", reservesSlot: false } },
      { new: true }
    );
    if (!slot) {
      return res.status(404).json({ message: "Available slot not found." });
    }
    return res.status(200).json({ message: "Availability removed." });
  } catch (error) {
    console.error("Counsellor availability removal failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to remove availability right now." });
  }
};

const bookAppointment = async (req, res) => {
  const { slotId, sessionType } = req.body || {};
  if (!mongoose.isValidObjectId(slotId) || !allowedSessionTypes.includes(sessionType)) {
    return res.status(400).json({ message: "Choose a valid available time and session type." });
  }

  try {
    const slot = await Appointment.findOneAndUpdate(
      {
        _id: slotId,
        status: "available",
        startsAt: { $gt: new Date() }
      },
      {
        $set: {
          studentId: req.user.id,
          sessionType,
          status: "pending"
        }
      },
      { new: true }
    );
    if (!slot) {
      return res.status(409).json({ message: "This time is no longer available. Please choose another slot." });
    }

    const counsellor = await User.findOne({
      _id: slot.counsellorId,
      role: "counsellor",
      status: "active",
      isActive: true
    }).select("_id");
    if (!counsellor) {
      await Appointment.updateOne(
        { _id: slot._id, studentId: req.user.id, status: "pending" },
        { $set: { studentId: null, status: "available" } }
      );
      return res.status(409).json({ message: "This counsellor is not currently accepting appointments." });
    }

    return res.status(201).json({ appointment: slot });
  } catch (error) {
    console.error("Appointment booking failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to book this appointment right now." });
  }
};

const getStudentAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      studentId: req.user.id,
      status: { $ne: "available" }
    })
      .populate("counsellorId", "name qualification specialization")
      .sort({ startsAt: -1 })
      .lean();
    return res.status(200).json({ appointments });
  } catch (error) {
    console.error("Student appointment lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load your appointments right now." });
  }
};

const getCounsellorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      counsellorId: req.user.id,
      status: { $ne: "cancelled" }
    })
      .populate("studentId", "name email phoneNumber faculty year")
      .sort({ startsAt: 1 })
      .lean();
    return res.status(200).json({ appointments });
  } catch (error) {
    console.error("Counsellor appointment lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load your appointment schedule right now." });
  }
};

const updateAppointmentStatus = async (req, res) => {
  const { status } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id) || !["confirmed", "cancelled", "completed"].includes(status)) {
    return res.status(400).json({ message: "Choose a valid appointment status." });
  }

  const permittedFrom = status === "confirmed" || status === "cancelled"
    ? ["pending", "confirmed"]
    : ["confirmed"];

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        counsellorId: req.user.id,
        status: { $in: permittedFrom },
        studentId: { $ne: null },
        ...(status === "completed" ? { startsAt: { $lte: new Date() } } : {})
      },
      { $set: { status, reservesSlot: status !== "cancelled" } },
      { new: true }
    );
    if (!appointment) {
      return res.status(409).json({ message: "This appointment can no longer be updated." });
    }
    return res.status(200).json({ appointment });
  } catch (error) {
    console.error("Appointment status update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update this appointment right now." });
  }
};

const getAppointmentById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      studentId: req.user.id,
      status: { $ne: "available" }
    })
      .populate("counsellorId", "name qualification specialization")
      .lean();
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }
    return res.status(200).json({ appointment });
  } catch (error) {
    console.error("Appointment detail lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load this appointment right now." });
  }
};

module.exports = {
  createAvailability,
  deleteAvailability,
  bookAppointment,
  getStudentAppointments,
  getCounsellorAppointments,
  updateAppointmentStatus,
  getAppointmentById
};
