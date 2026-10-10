const Appointment = require("../models/Appointment");
const { notify, formatWhen } = require("./notify");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Upcoming reminders, listed shortest first. Sending a shorter reminder also marks the longer
// ones as sent ("supersedes"), so a session booked 3 minutes ahead gets one "starting in 5 min"
// notification instead of 24h + 1h + 5m all at once.
const UPCOMING = [
  {
    flag: "reminder5mSent",
    type: "reminder_5m",
    within: 5 * MINUTE,
    label: "in 5 minutes",
    supersedes: ["reminder1hSent", "reminder24Sent"]
  },
  {
    flag: "reminder1hSent",
    type: "reminder_1h",
    within: HOUR,
    label: "in about an hour",
    supersedes: ["reminder24Sent"]
  },
  { flag: "reminder24Sent", type: "reminder_24h", within: 24 * HOUR, label: "tomorrow", supersedes: [] }
];

const ACTIVE_STATUSES = ["pending", "confirmed"];

const claim = async (appointmentId, flags) => {
  // Atomic: only the pass that flips the first flag from not-true to true gets to send.
  const result = await Appointment.updateOne(
    { _id: appointmentId, [flags[0]]: { $ne: true } },
    { $set: Object.fromEntries(flags.map((f) => [f, true])) }
  );
  return result.modifiedCount > 0;
};

const sessionLabel = (appt) => appt.sessionType.replace("-", " ");
const counsellorName = (appt) => appt.counsellorId?.name || "your counsellor";
const counsellorUserId = (appt) => appt.counsellorId?._id || appt.counsellorId;

const sendUpcoming = async (w, appt) => {
  const when = formatWhen(appt.startsAt);
  const soon = w.type === "reminder_5m" || w.type === "reminder_1h";

  await notify({
    userId: appt.studentId,
    type: w.type,
    title: w.type === "reminder_5m" ? "Your session starts in 5 minutes" : soon ? "Your session starts soon" : "Session reminder",
    body: `Your ${sessionLabel(appt)} session with ${counsellorName(appt)} is ${w.label} (${when}).`,
    appointmentId: appt._id,
    email: w.type !== "reminder_5m"
  });

  if (soon) {
    await notify({
      userId: counsellorUserId(appt),
      type: w.type,
      title: w.type === "reminder_5m" ? "Session starts in 5 minutes" : "Next session in about an hour",
      body: `A session is scheduled at ${when}.`,
      appointmentId: appt._id
    });
  }
};

const sendOngoing = async (appt) => {
  const when = formatWhen(appt.startsAt);

  await notify({
    userId: appt.studentId,
    type: "session_ongoing",
    title: "Your session is starting now",
    body: `Your ${sessionLabel(appt)} session with ${counsellorName(appt)} is starting now (${when}).`,
    appointmentId: appt._id
  });
  await notify({
    userId: counsellorUserId(appt),
    type: "session_ongoing",
    title: "Your session is starting now",
    body: `A ${sessionLabel(appt)} session is starting now (${when}).`,
    appointmentId: appt._id
  });
};

// Runs every minute. Sends each reminder once per appointment (FR3).
const runReminderPass = async () => {
  const now = new Date();

  // 1. Ongoing: the session has started and has not finished yet.
  //    (startsAt <= now < startsAt + duration). Fetch recent starts, then check the end in code.
  const started = await Appointment.find({
    status: { $in: ACTIVE_STATUSES },
    studentId: { $ne: null },
    reminderOngoingSent: { $ne: true },
    startsAt: { $lte: now, $gt: new Date(now.getTime() - 90 * MINUTE) }
  })
    .populate("counsellorId", "name")
    .limit(200);

  for (const appt of started) {
    const endsAt = appt.startsAt.getTime() + appt.durationMinutes * MINUTE;
    if (endsAt <= now.getTime()) continue;
    if (!(await claim(appt._id, ["reminderOngoingSent", "reminder5mSent", "reminder1hSent", "reminder24Sent"]))) continue;
    await sendOngoing(appt);
  }

  // 2. Upcoming: 5 minutes, 1 hour, 1 day before.
  for (const w of UPCOMING) {
    const due = await Appointment.find({
      status: { $in: ACTIVE_STATUSES },
      studentId: { $ne: null },
      [w.flag]: { $ne: true },
      startsAt: { $gt: now, $lte: new Date(now.getTime() + w.within) }
    })
      .populate("counsellorId", "name")
      .limit(200);

    for (const appt of due) {
      if (!(await claim(appt._id, [w.flag, ...w.supersedes]))) continue;
      await sendUpcoming(w, appt);
    }
  }
};

let timer = null;
const startReminderScheduler = () => {
  if (timer) return;
  const tick = () => runReminderPass().catch((e) => console.error("Reminder pass failed:", e.code || e.name));
  timer = setInterval(tick, 30 * 1000);
  timer.unref?.();
  tick();
  console.log("Reminder scheduler started (24h, 1h, 5m and ongoing).");
};

module.exports = { startReminderScheduler, runReminderPass };
