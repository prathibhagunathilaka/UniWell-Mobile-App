const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");

const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

const listNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: req.user.id, readAt: null })
    ]);
    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notification list failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load notifications right now." });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, readAt: null });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load notifications right now." });
  }
};

const markRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid notification ID." });
  }
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return res.status(200).json({ message: "Marked as read." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update this notification." });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update notifications." });
  }
};

// POST /api/notifications/push-token — body: { token, platform? }
// A phone token belongs to one account at a time: it is removed from everyone else first.
const registerPushToken = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!EXPO_TOKEN.test(token)) {
    return res.status(400).json({ message: "Invalid push token." });
  }
  const platform = typeof req.body?.platform === "string" ? req.body.platform.slice(0, 20) : "android";

  try {
    await User.updateMany({ "pushTokens.token": token }, { $pull: { pushTokens: { token } } });
    await User.updateOne(
      { _id: req.user.id },
      { $push: { pushTokens: { $each: [{ token, platform, updatedAt: new Date() }], $slice: -5 } } }
    );
    return res.status(200).json({ message: "Push notifications enabled on this device." });
  } catch (error) {
    console.error("Push token save failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to enable phone notifications right now." });
  }
};

// DELETE /api/notifications/push-token — body: { token }
const removePushToken = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) {
    return res.status(400).json({ message: "Push token is required." });
  }
  try {
    await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: { token } } });
    return res.status(200).json({ message: "Push notifications disabled on this device." });
  } catch (error) {
    console.error("Push token removal failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update phone notifications right now." });
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  registerPushToken,
  removePushToken
};
