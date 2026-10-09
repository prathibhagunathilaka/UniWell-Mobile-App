const Notification = require("../models/Notification");
const User = require("../models/User");
const { hasMailConfiguration, createMailer } = require("./authOtp");

const formatWhen = (date) =>
  new Date(date).toLocaleString("en-LK", {
    timeZone: process.env.REPORT_TIME_ZONE || "Asia/Colombo",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

const REMINDER_TYPES = new Set(["reminder_24h", "reminder_1h"]);

// Creates an in-app notification and, best-effort, an email copy.
// Respects the person's Settings: reminders follow "Session reminders", everything else
// follows "Push notifications". Never throws: a failed notification must not break a booking.
const notify = async ({ userId, type, title, body, appointmentId = null, email = false }) => {
  let user = null;
  try {
    user = await User.findById(userId).select("email preferences").lean();
  } catch (error) {
    console.error("Notification preference lookup failed:", error.code || error.name);
  }

  const prefs = user?.preferences || {};
  const allowed = REMINDER_TYPES.has(type) ? prefs.remindersEnabled !== false : prefs.pushEnabled !== false;
  if (!allowed) return;

  try {
    await Notification.create({ userId, type, title, body, appointmentId });
  } catch (error) {
    console.error("Notification create failed:", error.code || error.name);
  }

  if (!email || !user?.email || !hasMailConfiguration()) return;
  try {
    await createMailer().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: `UniWell: ${title}`,
      text: `${body}\n\nOpen the UniWell app for details.`
    });
  } catch (error) {
    console.error("Notification email failed:", error.code || error.name);
  }
};

module.exports = { notify, formatWhen };
