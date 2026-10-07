const mongoose = require("mongoose");
const User = require("../models/User");

const getPendingCounsellors = async (req, res) => {
  try {
    // Return only the details needed to review pending applications, oldest first.
    const counsellors = await User.find({ role: "counsellor", status: "pending" })
      .select("name email phoneNumber qualification specialization yearsOfExperience createdAt")
      .sort({ createdAt: 1 })
      .lean();
    return res.status(200).json({ counsellors });
  } catch (error) {
    console.error("Pending counsellor lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load pending counsellors right now." });
  }
};

const updateCounsellorApproval = async (req, res) => {
  const { status } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id) || !["active", "suspended"].includes(status)) {
    return res.status(400).json({ message: "Choose a valid counsellor account status." });
  }
  try {
    const counsellor = await User.findOneAndUpdate(
      { _id: req.params.id, role: "counsellor" },
      { $set: { status, isActive: status === "active" } },
      { new: true }
    ).select("name email status");
    if (!counsellor) {
      return res.status(404).json({ message: "Counsellor account not found." });
    }
    return res.status(200).json({ counsellor });
  } catch (error) {
    console.error("Counsellor approval update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update this counsellor account right now." });
  }
};

module.exports = { getPendingCounsellors, updateCounsellorApproval };
