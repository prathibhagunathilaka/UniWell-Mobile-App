const Appointment = require("../models/Appointment");
const { notify, formatWhen } = require("./notify");

const HOUR = 60 * 60 * 1000;

// Runs every minute. Sends each reminder once per appointment (FR3).
const runReminderPass = async () => {
  const now = new Date();

  const windows = [
    { flag: "reminder24Sent", type: "reminder_24h", within: 24 * HOUR, label: "tomorrow" },
    { flag: "reminder1hSent", type: "reminder_1h", within: HOUR, label: "in about an hour" }
  ];

  for (const w of windows) {
    const due = await Appointment.find({
      status: { $in: ["pending", "confirmed"] },
      studentId: { $ne: null },
      [w.flag]: { $ne: true },
      startsAt: { $gt: now, $lte: new Date(now.getTime() + w.within) }
    })
      .populate("counsellorId", "name")
      .limit(200);

    for (const appt of due) {
      // Claim first (atomic) so overlapping passes cannot double-send.
      const claimed = await Appointment.updateOne(
        { _id: appt._id, [w.flag]: { $ne: true } },
        { $set: { [w.flag]: true } }
      );
      if (!claimed.modifiedCount) continue;

      const when = formatWhen(appt.startsAt);
      await notify({
        userId: appt.studentId,
        type: w.type,
        title: w.type === "reminder_1h" ? "Your session starts soon" : "Session reminder",
        body: `Your ${appt.sessionType.replace("-", " ")} session with ${appt.counsellorId?.name || "your counsellor"} is ${w.label} (${when}).`,
        appointmentId: appt._id,
        email: true
      });
      if (w.type === "reminder_1h") {
        await notify({
          userId: appt.counsellorId?._id || appt.counsellorId,
          type: w.type,
          title: "Next session in about an hour",
          body: `A session is scheduled at ${when}.`,
          appointmentId: appt._id
        });
      }
    }
  }
};

let timer = null;
const startReminderScheduler = () => {
  if (timer) return;
  const tick = () => runReminderPass().catch((e) => console.error("Reminder pass failed:", e.code || e.name));
  timer = setInterval(tick, 60 * 1000);
  timer.unref?.();
  tick();
  console.log("Reminder scheduler started (24h and 1h reminders).");
};

module.exports = { startReminderScheduler, runReminderPass };
