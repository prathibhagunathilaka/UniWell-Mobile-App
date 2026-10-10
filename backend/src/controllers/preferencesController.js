const User = require("../models/User");

const shape = (user) => ({
  pushEnabled: user.preferences?.pushEnabled !== false,
  remindersEnabled: user.preferences?.remindersEnabled !== false
});

// GET /api/auth/preferences — works for students, counsellors and admins.
const getPreferences = async (req, res) => {
  return res.status(200).json({ preferences: shape(req.userRecord) });
};

// PATCH /api/auth/preferences — body: { pushEnabled?: boolean, remindersEnabled?: boolean }
const updatePreferences = async (req, res) => {
  const changes = {};

  for (const key of ["pushEnabled", "remindersEnabled"]) {
    if (req.body?.[key] === undefined) continue;
    if (typeof req.body[key] !== "boolean") {
      return res.status(400).json({ message: "Notification settings must be true or false." });
    }
    changes[`preferences.${key}`] = req.body[key];
  }

  if (!Object.keys(changes).length) {
    return res.status(400).json({ message: "No settings to update." });
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: changes }, { new: true }).select("preferences");
    return res.status(200).json({ preferences: shape(user || req.userRecord) });
  } catch (error) {
    console.error("Preferences update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to save your settings right now." });
  }
};

// POST /api/auth/logout-all — invalidates every issued token (all devices, including this one).
const logoutAllDevices = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
    return res.status(200).json({ message: "You have been signed out of all devices." });
  } catch (error) {
    console.error("Logout-all failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to sign you out of all devices right now." });
  }
};

module.exports = { getPreferences, updatePreferences, logoutAllDevices };
