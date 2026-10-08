const crypto = require("crypto");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { buildCalendar } = require("../utils/ical");

const bookedStatuses = ["pending", "confirmed", "completed", "cancelled"];

const loadBookings = (counsellorId) =>
  Appointment.find({
    counsellorId,
    studentId: { $ne: null },
    status: { $in: bookedStatuses },
    startsAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  })
    .populate("studentId", "name")
    .sort({ startsAt: 1 })
    .lean();

// Private subscription URL. Google/Apple/Outlook calendars poll it automatically,
// which is how bookings "sync" to the counsellor's own calendar (FR4).
const feedUrl = (req, token) =>
  `${req.protocol}://${req.get("host")}/api/calendar/feed/${token}.ics`;

const getSyncStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+calendarToken calendarLastFetchedAt");
    const bookings = await loadBookings(req.user.id);
    const upcoming = bookings.filter((b) => b.status !== "cancelled" && new Date(b.startsAt) > new Date());
    return res.status(200).json({
      enabled: Boolean(user.calendarToken),
      feedUrl: user.calendarToken ? feedUrl(req, user.calendarToken) : null,
      webcalUrl: user.calendarToken ? feedUrl(req, user.calendarToken).replace(/^https?:/, "webcal:") : null,
      lastFetchedAt: user.calendarLastFetchedAt,
      upcomingBookings: upcoming.length,
      pendingBookings: upcoming.filter((b) => b.status === "pending").length
    });
  } catch (error) {
    console.error("Calendar sync status failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load calendar sync status." });
  }
};

const rotateToken = async (req, res) => {
  try {
    const token = crypto.randomBytes(24).toString("hex");
    await User.updateOne({ _id: req.user.id }, { $set: { calendarToken: token, calendarLastFetchedAt: null } });
    return res.status(200).json({
      enabled: true,
      feedUrl: feedUrl(req, token),
      webcalUrl: feedUrl(req, token).replace(/^https?:/, "webcal:"),
      lastFetchedAt: null
    });
  } catch (error) {
    console.error("Calendar token rotation failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to create the calendar link." });
  }
};

const disableFeed = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $unset: { calendarToken: 1 } });
    return res.status(200).json({ message: "Calendar link disabled." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to disable the calendar link." });
  }
};

// One-off export: returned as JSON so the app can hand it to the OS share sheet.
const exportCalendar = async (req, res) => {
  try {
    const bookings = await loadBookings(req.user.id);
    return res.status(200).json({
      filename: "uniwell-appointments.ics",
      ics: buildCalendar(bookings, `UniWell - ${req.user.name}`)
    });
  } catch (error) {
    console.error("Calendar export failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to export your calendar." });
  }
};

// Public (token-protected) feed consumed by calendar apps.
const serveFeed = async (req, res) => {
  const token = String(req.params.token || "").replace(/\.ics$/i, "");
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return res.status(404).send("Not found");
  }
  try {
    const user = await User.findOne({ calendarToken: token, role: "counsellor", status: "active", isActive: true })
      .select("name");
    if (!user) return res.status(404).send("Not found");
    await User.updateOne({ _id: user._id }, { $set: { calendarLastFetchedAt: new Date() } });
    const bookings = await loadBookings(user._id);
    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Cache-Control", "private, max-age=300");
    return res.status(200).send(buildCalendar(bookings, `UniWell - ${user.name}`));
  } catch (error) {
    console.error("Calendar feed failed:", error.code || error.name);
    return res.status(500).send("Unable to build calendar");
  }
};

module.exports = { getSyncStatus, rotateToken, disableFeed, exportCalendar, serveFeed };
