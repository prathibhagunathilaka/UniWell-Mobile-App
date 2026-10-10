const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const Resource = require("../models/Resource");
const User = require("../models/User");
const { notify, formatWhen } = require("../utils/notify");

const DAY_MS = 24 * 60 * 60 * 1000;
const TZ_OFFSET_MIN = Number(process.env.REPORT_TZ_OFFSET_MINUTES ?? 330); // same zone the reports use

const getPendingCounsellors = async (req, res) => {
  try {
    const counsellors = await User.find({ role: "counsellor", status: "pending" })
      .select("name email phoneNumber qualification specialization yearsOfExperience createdAt")
      .sort({ createdAt: 1 })
      .lean();
    return res.status(200).json({ counsellors });
  } catch (error) {
    console.error("Pending counsellor lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load pending counsellors right now." });
  }
};

// When a counsellor stops being available (suspended or removed): cancel their upcoming bookings,
// free the slots, drop unbooked availability and tell the affected students. Past sessions are kept
// so reports and students' history stay intact. Students are only told the counsellor is unavailable.
const releaseSchedule = async (counsellor) => {
  const now = new Date();
  const booked = await Appointment.find({
    counsellorId: counsellor._id,
    studentId: { $ne: null },
    status: { $in: ["pending", "confirmed"] },
    startsAt: { $gt: now }
  }).select("studentId startsAt").lean();

  if (booked.length) {
    await Appointment.updateMany(
      { _id: { $in: booked.map((b) => b._id) } },
      { $set: { status: "cancelled", reservesSlot: false, cancelledBy: "counsellor", cancelledAt: now } }
    );
  }
  await Appointment.deleteMany({ counsellorId: counsellor._id, status: "available", startsAt: { $gt: now } });

  for (const b of booked) {
    await notify({
      userId: b.studentId,
      type: "booking_cancelled",
      title: "Session cancelled",
      body: `Your session on ${formatWhen(b.startsAt)} was cancelled because ${counsellor.name} is no longer available. Please book another counsellor.`,
      appointmentId: b._id,
      email: true
    });
  }
  return booked.length;
};

// Approve / decline an application, or suspend / reactivate an existing counsellor.
const updateCounsellorApproval = async (req, res) => {
  const { status } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id) || !["active", "suspended"].includes(status)) {
    return res.status(400).json({ message: "Choose a valid counsellor account status." });
  }
  try {
    const existing = await User.findOne({ _id: req.params.id, role: "counsellor" }).select("name status");
    if (!existing) {
      return res.status(404).json({ message: "Counsellor account not found." });
    }
    const wasActive = existing.status === "active";
    const counsellor = await User.findOneAndUpdate(
      { _id: req.params.id, role: "counsellor" },
      { $set: { status, isActive: status === "active" } },
      { new: true }
    ).select("name email status");

    const releasedBookings = status === "suspended" && wasActive ? await releaseSchedule(counsellor) : 0;
    return res.status(200).json({ counsellor, releasedBookings });
  } catch (error) {
    console.error("Counsellor approval update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update this counsellor account right now." });
  }
};

// NEW: every counsellor (pending, active, suspended) with simple schedule counts, for the manage screen.
const listManagedCounsellors = async (req, res) => {
  try {
    const counsellors = await User.find({ role: "counsellor" })
      .select("name email phoneNumber qualification specialization yearsOfExperience status createdAt")
      .lean();
    const stats = await Appointment.aggregate([
      {
        $match: {
          counsellorId: { $in: counsellors.map((c) => c._id) },
          startsAt: { $gt: new Date() },
          status: { $in: ["available", "pending", "confirmed"] }
        }
      },
      { $group: { _id: { counsellorId: "$counsellorId", status: "$status" }, count: { $sum: 1 } } }
    ]);
    const byId = new Map();
    for (const row of stats) {
      const key = String(row._id.counsellorId);
      const entry = byId.get(key) || { upcomingBookings: 0, pendingBookings: 0, openSlots: 0 };
      if (row._id.status === "available") entry.openSlots += row.count;
      else entry.upcomingBookings += row.count;
      if (row._id.status === "pending") entry.pendingBookings += row.count;
      byId.set(key, entry);
    }
    return res.status(200).json({
      counsellors: counsellors.map((c) => ({
        ...c,
        stats: byId.get(String(c._id)) || { upcomingBookings: 0, pendingBookings: 0, openSlots: 0 }
      }))
    });
  } catch (error) {
    console.error("Managed counsellor lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load counsellors right now." });
  }
};

// NEW: permanently remove a counsellor account. Upcoming bookings are cancelled (students notified),
// unbooked slots and the counsellor's notifications are deleted. Past sessions and published
// resources are kept.
const removeCounsellor = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid counsellor ID." });
  }
  try {
    const counsellor = await User.findOne({ _id: req.params.id, role: "counsellor" }).select("name");
    if (!counsellor) {
      return res.status(404).json({ message: "Counsellor account not found." });
    }
    const releasedBookings = await releaseSchedule(counsellor);
    await Appointment.deleteMany({ counsellorId: counsellor._id, status: "available" });
    await Notification.deleteMany({ userId: counsellor._id });
    await User.deleteOne({ _id: counsellor._id });
    return res.status(200).json({ message: "Counsellor removed.", releasedBookings });
  } catch (error) {
    console.error("Counsellor removal failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to remove this counsellor right now." });
  }
};

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

// NEW: live numbers for the admin home page. Counts only - no names, emails or student IDs.
const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const offset = TZ_OFFSET_MIN * 60 * 1000;
    const dayStart = new Date(Math.floor((now.getTime() + offset) / DAY_MS) * DAY_MS - offset);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const weekAhead = new Date(now.getTime() + 7 * DAY_MS);
    const booked = { studentId: { $ne: null } };

    const [
      students,
      newStudents,
      counsellorGroups,
      bookingsToday,
      bookedNext7,
      openNext7,
      awaitingConfirmation,
      resources
    ] = await Promise.all([
      User.countDocuments({ role: "student", status: "active" }),
      User.countDocuments({ role: "student", createdAt: { $gte: weekAgo } }),
      User.aggregate([{ $match: { role: "counsellor" } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Appointment.countDocuments({ ...booked, status: { $in: ["pending", "confirmed", "completed"] }, startsAt: { $gte: dayStart, $lt: dayEnd } }),
      Appointment.countDocuments({ ...booked, status: { $in: ["pending", "confirmed"] }, startsAt: { $gt: now, $lte: weekAhead } }),
      Appointment.countDocuments({ status: "available", startsAt: { $gt: now, $lte: weekAhead } }),
      Appointment.countDocuments({ ...booked, status: "pending", startsAt: { $gt: now } }),
      Resource.countDocuments({})
    ]);

    const counsellors = { active: 0, pending: 0, suspended: 0 };
    for (const group of counsellorGroups) {
      if (group._id in counsellors) counsellors[group._id] = group.count;
    }

    return res.status(200).json({
      overview: {
        generatedAt: now,
        users: { students, newStudents7d: newStudents, counsellors },
        today: { bookings: bookingsToday },
        next7Days: {
          booked: bookedNext7,
          openSlots: openNext7,
          utilisation: pct(bookedNext7, bookedNext7 + openNext7)
        },
        awaitingConfirmation,
        resources
      }
    });
  } catch (error) {
    console.error("Admin overview failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load the overview right now." });
  }
};

// Admin's own profile (name + phone are editable; email and username are fixed identifiers).
const adminProfileResponse = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  username: user.username || "",
  phoneNumber: user.phoneNumber || "",
  role: user.role,
  status: user.status
});

const getAdminProfile = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id, role: "admin" }).lean();
    if (!user) return res.status(404).json({ message: "Admin account not found." });
    return res.status(200).json({ admin: adminProfileResponse(user) });
  } catch (error) {
    console.error("Admin profile lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load your profile right now." });
  }
};

const updateAdminProfile = async (req, res) => {
  const { name, phoneNumber } = req.body || {};
  const update = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: "Enter a valid name." });
    }
    update.name = name.trim();
  }
  if (phoneNumber !== undefined) {
    const phone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    // Phone is optional for admins: an empty value clears it.
    if (phone && (!/^\+?[0-9().\-\s]{5,25}$/.test(phone) || (phone.match(/\d/g) || []).length < 5)) {
      return res.status(400).json({ message: "Enter a valid phone number." });
    }
    update.phoneNumber = phone;
  }
  if (!Object.keys(update).length) {
    return res.status(400).json({ message: "Nothing to update." });
  }

  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, role: "admin" },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!user) return res.status(404).json({ message: "Admin account not found." });
    return res.status(200).json({ message: "Profile updated.", admin: adminProfileResponse(user) });
  } catch (error) {
    console.error("Admin profile update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update your profile right now." });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile,
  getPendingCounsellors,
  updateCounsellorApproval,
  listManagedCounsellors,
  removeCounsellor,
  getOverview
};
