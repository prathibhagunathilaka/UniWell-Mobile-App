const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const CheckIn = require("../models/CheckIn");
const { notify, formatWhen } = require("../utils/notify");
const { buildCalendar } = require("../utils/ical");

const allowedSessionTypes = ["in-person", "online", "phone"];

// Counsellors choose the slot length. Every slot reserves one key per 15-minute block it covers,
// so the unique index on (counsellorId, slotKeys) still rejects any overlap, whatever the length.
const allowedDurations = [15, 30, 45, 60, 90];
const buildSlotKeys = (startsAt, durationMinutes) =>
  Array.from({ length: durationMinutes / 15 }, (_, i) => new Date(startsAt.getTime() + i * 15 * 60 * 1000));

const createAvailability = async (req, res) => {
  const startsAt = new Date(req.body?.startsAt);
  const durationMinutes = Number(req.body?.durationMinutes || 30);
  if (
    !Number.isFinite(startsAt.getTime()) ||
    startsAt <= new Date() ||
    startsAt > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) ||
    !allowedDurations.includes(durationMinutes) ||
    startsAt.getUTCMinutes() % 15 !== 0 ||
    startsAt.getUTCSeconds() !== 0 ||
    startsAt.getUTCMilliseconds() !== 0
  ) {
    return res.status(400).json({ message: "Choose a future start time on a 15-minute boundary and a slot length of 15, 30, 45, 60 or 90 minutes." });
  }

  try {
    const appointment = await Appointment.create({
      counsellorId: req.user.id,
      startsAt,
      durationMinutes,
      slotKeys: buildSlotKeys(startsAt, durationMinutes),
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
  const shareCheckIn = req.body?.shareCheckIn === true;
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
          shareCheckIn,
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

    // NEW: booking is "synced" to the counsellor's calendar automatically (FR4) and both
    // sides get an in-app notification (FR3).
    const when = formatWhen(slot.startsAt);
    await notify({
      userId: slot.counsellorId,
      type: "booking_created",
      title: "New booking added to your calendar",
      body: `A student booked a ${sessionType.replace("-", " ")} session for ${when}. Please confirm it.`,
      appointmentId: slot._id,
      email: true
    });
    await notify({
      userId: req.user.id,
      type: "booking_created",
      title: "Booking received",
      body: `Your session on ${when} is waiting for the counsellor to confirm.`,
      appointmentId: slot._id
    });

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
      {
        $set: {
          status,
          reservesSlot: status !== "cancelled",
          ...(status === "cancelled" ? { cancelledBy: "counsellor", cancelledAt: new Date() } : {})
        }
      },
      { new: true }
    );
    if (!appointment) {
      return res.status(409).json({ message: "This appointment can no longer be updated." });
    }
    const labels = {
      confirmed: ["booking_confirmed", "Session confirmed", "has confirmed"],
      cancelled: ["booking_cancelled", "Session cancelled", "has cancelled"],
      completed: ["booking_completed", "Session completed", "marked as completed"]
    };
    const [type, title, verb] = labels[status];
    await notify({
      userId: appointment.studentId,
      type,
      title,
      body: status === "completed"
        ? `Your session on ${formatWhen(appointment.startsAt)} was ${verb}. Don't forget to do a check-in this week.`
        : `Your counsellor ${verb} your session on ${formatWhen(appointment.startsAt)}.`,
      appointmentId: appointment._id,
      email: status !== "completed"
    });
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

// ---------------------------------------------------------------------------
// NEW: student cancellation (FR2 "book/cancel"). The cancelled booking is kept for
// reporting and the time slot is re-published so someone else can take it.
// ---------------------------------------------------------------------------
const cancelStudentAppointment = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        studentId: req.user.id,
        status: { $in: ["pending", "confirmed"] },
        startsAt: { $gt: new Date() }
      },
      { $set: { status: "cancelled", reservesSlot: false, cancelledBy: "student", cancelledAt: new Date() } },
      { new: true }
    ).select("+slotKeys");

    if (!appointment) {
      return res.status(409).json({ message: "This appointment can no longer be cancelled." });
    }

    try {
      await Appointment.create({
        counsellorId: appointment.counsellorId,
        startsAt: appointment.startsAt,
        durationMinutes: appointment.durationMinutes,
        slotKeys: appointment.slotKeys,
        status: "available"
      });
    } catch (error) {
      if (error.code !== 11000) console.error("Slot re-publish failed:", error.code || error.name);
    }

    await notify({
      userId: appointment.counsellorId,
      type: "booking_cancelled",
      title: "A student cancelled",
      body: `The session on ${formatWhen(appointment.startsAt)} was cancelled and the time is open again.`,
      appointmentId: appointment._id
    });

    appointment.slotKeys = undefined;
    return res.status(200).json({ appointment });
  } catch (error) {
    console.error("Student cancellation failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to cancel this appointment right now." });
  }
};

// ---------------------------------------------------------------------------
// NEW: add many availability slots at once, reporting conflicts instead of failing
// (addresses usability issue U6: no conflict handling in calendar sync).
// ---------------------------------------------------------------------------
const createAvailabilityBulk = async (req, res) => {
  const requested = Array.isArray(req.body?.slots) ? req.body.slots.slice(0, 200) : [];
  if (!requested.length) {
    return res.status(400).json({ message: "Provide at least one time slot." });
  }
  const durationMinutes = Number(req.body?.durationMinutes || 30);
  if (!allowedDurations.includes(durationMinutes)) {
    return res.status(400).json({ message: "Slot length must be 15, 30, 45, 60 or 90 minutes." });
  }

  const created = [];
  const skipped = [];
  const now = new Date();
  const limit = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  for (const raw of requested) {
    const startsAt = new Date(raw);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      startsAt <= now ||
      startsAt > limit ||
      startsAt.getUTCMinutes() % 15 !== 0 ||
      startsAt.getUTCSeconds() !== 0
    ) {
      skipped.push({ startsAt: raw, reason: "Invalid or past time" });
      continue;
    }
    try {
      const slot = await Appointment.create({
        counsellorId: req.user.id,
        startsAt,
        durationMinutes,
        slotKeys: buildSlotKeys(startsAt, durationMinutes),
        status: "available"
      });
      created.push({ _id: slot._id, startsAt: slot.startsAt });
    } catch (error) {
      if (error.code === 11000) {
        skipped.push({ startsAt: startsAt.toISOString(), reason: "Overlaps an existing slot or appointment" });
      } else {
        skipped.push({ startsAt: startsAt.toISOString(), reason: "Could not be saved" });
      }
    }
  }
  return res.status(created.length ? 201 : 409).json({ created, skipped });
};

// ---------------------------------------------------------------------------
// NEW: counsellor appointment detail. If (and only if) the student ticked
// "share my latest check-in" when booking, a short summary is included (NFR1).
// ---------------------------------------------------------------------------
const getCounsellorAppointmentById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      counsellorId: req.user.id,
      status: { $ne: "available" }
    })
      .populate("studentId", "name email phoneNumber faculty year")
      .lean();
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    let sharedCheckIn = null;
    if (appointment.shareCheckIn && appointment.studentId?._id) {
      const latest = await CheckIn.findOne({ studentId: appointment.studentId._id })
        .sort({ createdAt: -1 })
        .select("mood stressLevel sleepQuality studyCoping wellbeingScore wellbeingLevel createdAt")
        .lean();
      sharedCheckIn = latest || null;
    }
    return res.status(200).json({ appointment, sharedCheckIn });
  } catch (error) {
    console.error("Counsellor appointment detail failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load this appointment right now." });
  }
};

// ---------------------------------------------------------------------------
// NEW: one-tap post-session rating (1-5). Only for the student's own completed session, once.
// ---------------------------------------------------------------------------
const submitFeedback = async (req, res) => {
  const rating = Number(req.body?.rating);
  if (!mongoose.isValidObjectId(req.params.id) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Choose a rating from 1 to 5." });
  }
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, studentId: req.user.id, status: "completed", feedbackRating: null },
      { $set: { feedbackRating: rating, feedbackAt: new Date() } },
      { new: true }
    ).select("feedbackRating feedbackAt");
    if (!appointment) {
      return res.status(409).json({ message: "Feedback can only be given once, after a completed session." });
    }
    return res.status(200).json({ appointment });
  } catch (error) {
    console.error("Feedback save failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to save your feedback right now." });
  }
};

// NEW: student can add a single session to their own phone calendar (.ics via share sheet).
const exportStudentAppointmentCalendar = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      studentId: req.user.id,
      status: { $in: ["pending", "confirmed"] }
    })
      .populate("counsellorId", "name")
      .lean();
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }
    const ics = buildCalendar(
      [{ ...appointment, studentId: { name: appointment.counsellorId?.name || "your counsellor" } }],
      "UniWell session"
    ).replace("SUMMARY:Counselling: ", "SUMMARY:UniWell session with ");
    return res.status(200).json({ filename: "uniwell-session.ics", ics });
  } catch (error) {
    console.error("Student calendar export failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to export this session." });
  }
};

module.exports = {
  submitFeedback,
  exportStudentAppointmentCalendar,
  createAvailability,
  deleteAvailability,
  bookAppointment,
  getStudentAppointments,
  getCounsellorAppointments,
  updateAppointmentStatus,
  getAppointmentById,
  cancelStudentAppointment,
  createAvailabilityBulk,
  getCounsellorAppointmentById
};
