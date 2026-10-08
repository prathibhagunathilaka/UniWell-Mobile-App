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

// Creates an in-app notification and, best-effort, an email copy.
// Never throws: a failed notification must not break a booking.
const notify = async ({ userId, type, title, body, appointmentId = null, email = false }) => {
  try {
    await Notification.create({ userId, type, title, body, appointmentId });
  } catch (error) {
    console.error("Notification create failed:", error.code || error.name);
  }

  if (!email || !hasMailConfiguration()) return;
  try {
    const user = await User.findById(userId).select("email").lean();
    if (!user?.email) return;
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
