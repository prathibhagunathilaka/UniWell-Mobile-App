const mongoose = require("mongoose");
const Notification = require("../models/Notification");

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

module.exports = { listNotifications, getUnreadCount, markRead, markAllRead };
