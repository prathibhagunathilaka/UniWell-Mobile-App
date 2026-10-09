const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const CheckIn = require("../models/CheckIn");
const User = require("../models/User");

// Anonymisation rule (NFR4): this module never returns student names, emails or IDs.
// Small check-in groups are suppressed so individuals cannot be inferred.
const MIN_GROUP = 5;
const TZ_OFFSET_MIN = Number(process.env.REPORT_TZ_OFFSET_MINUTES ?? 330); // Sri Lanka, UTC+5:30
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const local = (date) => new Date(new Date(date).getTime() + TZ_OFFSET_MIN * 60 * 1000);
const dayKey = (date) => local(date).toISOString().slice(0, 10);
// Monday (report time zone) of the week containing `date`, as YYYY-MM-DD.
const weekStartKey = (date) => {
  const l = local(date);
  const d = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
const suppress = (n) => (n >= MIN_GROUP ? n : `<${MIN_GROUP}`);

const parseFilters = (query) => {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.getTime() - 90 * DAY_MS);
  const to = query.to ? new Date(query.to) : new Date(now.getTime() + 30 * DAY_MS);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    return { error: "Choose a valid date range." };
  }
  if (to.getTime() - from.getTime() > 400 * DAY_MS) {
    return { error: "Date range cannot be longer than 400 days." };
  }
  if (query.counsellorId && !mongoose.isValidObjectId(query.counsellorId)) {
    return { error: "Invalid counsellor filter." };
  }
  const sessionType = ["in-person", "online", "phone"].includes(query.sessionType) ? query.sessionType : null;
  return { from, to, counsellorId: query.counsellorId || null, sessionType };
};

const buildReport = async (filters) => {
  const { from, to, counsellorId, sessionType } = filters;
  const now = new Date();

  const baseMatch = { startsAt: { $gte: from, $lte: to } };
  if (counsellorId) baseMatch.counsellorId = new mongoose.Types.ObjectId(counsellorId);

  const [bookings, openSlots, counsellors, checkIns] = await Promise.all([
    Appointment.find({
      ...baseMatch,
      studentId: { $ne: null },
      status: { $in: ["pending", "confirmed", "completed", "cancelled"] },
      ...(sessionType ? { sessionType } : {})
    })
      .select("counsellorId startsAt status sessionType cancelledBy feedbackRating")
      .lean(),
    Appointment.find({ ...baseMatch, status: "available", startsAt: { $gt: now, $lte: to } })
      .select("counsellorId")
      .lean(),
    User.find({ role: "counsellor", status: "active", ...(counsellorId ? { _id: counsellorId } : {}) })
      .select("name")
      .lean(),
    CheckIn.find({ createdAt: { $gte: from, $lte: to } })
      .select("wellbeingScore wellbeingLevel createdAt studentId")
      .lean()
  ]);

  const byStatus = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  const bySessionType = { online: 0, "in-person": 0, phone: 0 };
  const weekday = Array(7).fill(0);
  const hour = Array(24).fill(0);
  const perDay = new Map();
  const perWeek = new Map();
  const cancellations = { byStudent: 0, byCounsellor: 0 };
  const perCounsellor = new Map(counsellors.map((c) => [String(c._id), {
    counsellorId: String(c._id), name: c.name, bookings: 0, completed: 0, cancelled: 0, upcoming: 0, openSlots: 0
  }]));

  for (const b of bookings) {
    byStatus[b.status] += 1;
    bySessionType[b.sessionType] = (bySessionType[b.sessionType] || 0) + 1;
    perDay.set(dayKey(b.startsAt), (perDay.get(dayKey(b.startsAt)) || 0) + 1);
    const wk = weekStartKey(b.startsAt);
    const week = perWeek.get(wk) || { bookings: 0, completed: 0, cancelled: 0 };
    week.bookings += 1;
    if (b.status === "completed") week.completed += 1;
    if (b.status === "cancelled") {
      week.cancelled += 1;
      if (b.cancelledBy === "student") cancellations.byStudent += 1;
      if (b.cancelledBy === "counsellor") cancellations.byCounsellor += 1;
    }
    perWeek.set(wk, week);
    if (b.status !== "cancelled") {
      const l = local(b.startsAt);
      weekday[l.getUTCDay()] += 1;
      hour[l.getUTCHours()] += 1;
    }
    const row = perCounsellor.get(String(b.counsellorId));
    if (row) {
      row.bookings += 1;
      if (b.status === "completed") row.completed += 1;
      if (b.status === "cancelled") row.cancelled += 1;
      if (["pending", "confirmed"].includes(b.status) && b.startsAt > now) row.upcoming += 1;
    }
  }
  for (const s of openSlots) {
    const row = perCounsellor.get(String(s.counsellorId));
    if (row) row.openSlots += 1;
  }

  // Zero-filled weekly series (oldest first) for trend charts.
  const weekly = [];
  const lastWeek = weekStartKey(to);
  for (
    let cursor = new Date(`${weekStartKey(from)}T00:00:00Z`);
    cursor.toISOString().slice(0, 10) <= lastWeek && weekly.length < 70;
    cursor = new Date(cursor.getTime() + 7 * DAY_MS)
  ) {
    const key = cursor.toISOString().slice(0, 10);
    weekly.push({ weekStart: key, ...(perWeek.get(key) || { bookings: 0, completed: 0, cancelled: 0 }) });
  }

  const ratings = bookings.map((b) => b.feedbackRating).filter((r) => Number.isFinite(r));
  const satisfaction = ratings.length >= MIN_GROUP
    ? { suppressed: false, responses: ratings.length, average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 }
    : { suppressed: true, reason: `Fewer than ${MIN_GROUP} ratings in this period; hidden to protect privacy.` };

  const total = bookings.length;
  const pastResolvable = bookings.filter((b) => b.startsAt <= now && b.status !== "cancelled");
  const completionRate = pct(byStatus.completed, pastResolvable.length);
  const cancellationRate = pct(byStatus.cancelled, total);

  const peakWeekdayIndex = weekday.indexOf(Math.max(...weekday));
  const peakHourIndex = hour.indexOf(Math.max(...hour));
  const hasActivity = weekday.some((n) => n > 0);

  const workload = [...perCounsellor.values()].map((row) => {
    const active = row.bookings - row.cancelled;
    return { ...row, utilisationRate: pct(active, active + row.openSlots) };
  }).sort((a, b) => b.bookings - a.bookings);

  const totalActive = workload.reduce((n, r) => n + r.bookings - r.cancelled, 0);
  const totalOpen = workload.reduce((n, r) => n + r.openSlots, 0);
  const overallUtilisation = pct(totalActive, totalActive + totalOpen);

  // Check-in aggregates (no per-student rows).
  const levels = { "Needs Support": 0, Moderate: 0, "Doing Okay": 0, Positive: 0 };
  let scoreSum = 0;
  const students = new Set();
  const dailyScores = new Map();
  for (const c of checkIns) {
    levels[c.wellbeingLevel] = (levels[c.wellbeingLevel] || 0) + 1;
    scoreSum += c.wellbeingScore;
    students.add(String(c.studentId));
    const k = dayKey(c.createdAt);
    const d = dailyScores.get(k) || { sum: 0, n: 0 };
    d.sum += c.wellbeingScore;
    d.n += 1;
    dailyScores.set(k, d);
  }
  const checkInsVisible = checkIns.length >= MIN_GROUP && students.size >= MIN_GROUP;

  const insights = [];
  if (overallUtilisation !== null && overallUtilisation >= 85) {
    insights.push("Counsellor capacity is above 85% utilised - consider adding availability or staff.");
  }
  if (cancellationRate !== null && cancellationRate >= 25) {
    insights.push("More than a quarter of bookings were cancelled - review reminder timing and slot length.");
  }
  if (hasActivity) {
    insights.push(`Demand peaks on ${WEEKDAYS[peakWeekdayIndex]}s around ${String(peakHourIndex).padStart(2, "0")}:00.`);
  }
  if (totalOpen === 0 && total > 0) {
    insights.push("No open slots remain in the selected period; students may be turned away.");
  }

  return {
    filters: { from, to, counsellorId, sessionType },
    generatedAt: now,
    timeZoneOffsetMinutes: TZ_OFFSET_MIN,
    totals: {
      bookings: total,
      completed: byStatus.completed,
      cancelled: byStatus.cancelled,
      upcoming: byStatus.pending + byStatus.confirmed - pastResolvable.filter((b) => ["pending", "confirmed"].includes(b.status)).length,
      completionRate,
      cancellationRate,
      overallUtilisation,
      openSlots: totalOpen
    },
    byStatus,
    bySessionType,
    peak: hasActivity
      ? { weekday: WEEKDAYS[peakWeekdayIndex], hour: peakHourIndex, bookingsAtPeakWeekday: weekday[peakWeekdayIndex], bookingsAtPeakHour: hour[peakHourIndex] }
      : null,
    byWeekday: WEEKDAYS.map((label, i) => ({ label, count: weekday[i] })),
    byHour: hour.map((count, h) => ({ hour: h, count })),
    byDay: [...perDay.entries()].sort().map(([date, count]) => ({ date, count })),
    weekly,
    cancellations,
    workload,
    satisfaction,
    checkIns: checkInsVisible
      ? {
          suppressed: false,
          total: checkIns.length,
          participants: students.size,
          averageScore: Math.round((scoreSum / checkIns.length) * 100) / 100,
          levels: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, suppress(v)])),
          daily: [...dailyScores.entries()].sort().map(([date, d]) => ({
            date,
            averageScore: d.n >= MIN_GROUP ? Math.round((d.sum / d.n) * 100) / 100 : null
          }))
        }
      : { suppressed: true, reason: `Fewer than ${MIN_GROUP} check-ins in this period; hidden to protect privacy.` },
    insights,
    anonymisation: `No student identities are included. Groups smaller than ${MIN_GROUP} are hidden.`
  };
};

const getSummary = async (req, res) => {
  const filters = parseFilters(req.query || {});
  if (filters.error) return res.status(400).json({ message: filters.error });
  try {
    return res.status(200).json({ report: await buildReport(filters) });
  } catch (error) {
    console.error("Usage report failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to build the report right now." });
  }
};

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRows = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\n");

const exportReport = async (req, res) => {
  const filters = parseFilters(req.query || {});
  if (filters.error) return res.status(400).json({ message: filters.error });
  try {
    const r = await buildReport(filters);
    const rows = [
      ["UniWell anonymised usage report"],
      ["Period", r.filters.from.toISOString().slice(0, 10), r.filters.to.toISOString().slice(0, 10)],
      ["Generated", r.generatedAt.toISOString()],
      [r.anonymisation],
      [],
      ["Summary"],
      ["Total bookings", r.totals.bookings],
      ["Completed", r.totals.completed],
      ["Cancelled", r.totals.cancelled],
      ["Completion rate %", r.totals.completionRate ?? "n/a"],
      ["Cancellation rate %", r.totals.cancellationRate ?? "n/a"],
      ["Capacity utilisation %", r.totals.overallUtilisation ?? "n/a"],
      ["Open slots", r.totals.openSlots],
      [],
      ["Bookings by weekday"],
      ...r.byWeekday.map((d) => [d.label, d.count]),
      [],
      ["Bookings by hour (local)"],
      ...r.byHour.filter((h) => h.count).map((h) => [`${String(h.hour).padStart(2, "0")}:00`, h.count]),
      [],
      ["Counsellor workload", "Bookings", "Completed", "Cancelled", "Upcoming", "Open slots", "Utilisation %"],
      ...r.workload.map((w) => [w.name, w.bookings, w.completed, w.cancelled, w.upcoming, w.openSlots, w.utilisationRate ?? "n/a"]),
      [],
      ["Session satisfaction (1-5)"],
      ...(r.satisfaction.suppressed ? [[r.satisfaction.reason]] : [["Ratings", r.satisfaction.responses], ["Average", r.satisfaction.average]]),
      [],
      ["Check-in wellbeing (aggregate)"],
      ...(r.checkIns.suppressed
        ? [[r.checkIns.reason]]
        : [["Check-ins", r.checkIns.total], ["Average score (1-5)", r.checkIns.averageScore],
           ...Object.entries(r.checkIns.levels).map(([k, v]) => [k, v])])
    ];
    return res.status(200).json({
      filename: `uniwell-usage-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: csvRows(rows)
    });
  } catch (error) {
    console.error("Report export failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to export the report right now." });
  }
};

const listCounsellorsForFilter = async (req, res) => {
  try {
    const counsellors = await User.find({ role: "counsellor" })
      .select("name status specialization")
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({ counsellors });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load counsellors right now." });
  }
};

module.exports = { getSummary, exportReport, listCounsellorsForFilter };
