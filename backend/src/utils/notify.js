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

const REMINDER_TYPES = new Set(["reminder_24h", "reminder_1h", "reminder_5m", "session_ongoing"]);
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Sends a phone (push) notification through Expo's push service. Best-effort: never throws.
// Tokens that Expo reports as no longer valid are removed from the user.
const sendPush = async (userId, tokens, { title, body, data }) => {
  if (!tokens.length) return;
  try {
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data,
      sound: "default",
      channelId: "default",
      priority: "high"
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
    const result = await response.json().catch(() => null);
    const tickets = Array.isArray(result?.data) ? result.data : [];

    const dead = [];
    tickets.forEach((ticket, index) => {
      if (ticket?.status === "error") {
        console.error("Push ticket error:", ticket.details?.error || ticket.message);
        if (ticket.details?.error === "DeviceNotRegistered") dead.push(tokens[index]);
      }
    });

    if (dead.length) {
      await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token: { $in: dead } } } });
    }
  } catch (error) {
    console.error("Push send failed:", error.code || error.name);
  }
};

// Creates an in-app notification, sends a phone push, and, best-effort, an email copy.
// Respects the person's Settings: reminders follow "Session reminders", everything else
// follows "Push notifications". Never throws: a failed notification must not break a booking.
const notify = async ({ userId, type, title, body, appointmentId = null, email = false }) => {
  let user = null;
  try {
    user = await User.findById(userId).select("email preferences +pushTokens").lean();
  } catch (error) {
    console.error("Notification preference lookup failed:", error.code || error.name);
  }

  const prefs = user?.preferences || {};
  const allowed = REMINDER_TYPES.has(type) ? prefs.remindersEnabled !== false : prefs.pushEnabled !== false;
  if (!allowed) return;

  let created = null;
  try {
    created = await Notification.create({ userId, type, title, body, appointmentId });
  } catch (error) {
    console.error("Notification create failed:", error.code || error.name);
  }

  const tokens = (user?.pushTokens || []).map((entry) => entry.token).filter(Boolean);
  await sendPush(userId, tokens, {
    title,
    body,
    data: {
      type,
      appointmentId: appointmentId ? String(appointmentId) : null,
      notificationId: created ? String(created._id) : null
    }
  });

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
