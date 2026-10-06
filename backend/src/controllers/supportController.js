const User = require("../models/User");

const getSupportContacts = (req, res) => {
  return res.status(200).json({
    universityPhone: process.env.UNIVERSITY_SUPPORT_PHONE || "",
    universityWebsite: process.env.UNIVERSITY_SUPPORT_URL || "",
    emergencyPhone: process.env.EMERGENCY_SUPPORT_PHONE || "",
    emergencyWebsite: process.env.EMERGENCY_SUPPORT_URL || ""
  });
};

const getTrustedPerson = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select("trustedPerson").lean();
    const trustedPerson = student?.trustedPerson?.name ? student.trustedPerson : null;
    return res.status(200).json({ trustedPerson });
  } catch (error) {
    console.error("Trusted person lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load your trusted person right now." });
  }
};

const saveTrustedPerson = async (req, res) => {
  const { name, phoneNumber, relationship } = req.body || {};
  const cleaned = {
    name: String(name || "").trim(),
    phoneNumber: String(phoneNumber || "").trim(),
    relationship: String(relationship || "").trim()
  };
  const digits = cleaned.phoneNumber.replace(/\D/g, "");
  if (
    !cleaned.name || cleaned.name.length > 100 ||
    !cleaned.relationship || cleaned.relationship.length > 60 ||
    cleaned.phoneNumber.length > 25 || digits.length < 5
  ) {
    return res.status(400).json({ message: "Enter a name, relationship, and valid phone number." });
  }

  try {
    const student = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { trustedPerson: cleaned } },
      { new: true, runValidators: true }
    ).select("trustedPerson");
    return res.status(200).json({ trustedPerson: student.trustedPerson });
  } catch (error) {
    console.error("Trusted person save failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to save your trusted person right now." });
  }
};

const deleteTrustedPerson = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $unset: { trustedPerson: 1 } });
    return res.status(200).json({ message: "Trusted person removed." });
  } catch (error) {
    console.error("Trusted person removal failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to remove your trusted person right now." });
  }
};

module.exports = { getSupportContacts, getTrustedPerson, saveTrustedPerson, deleteTrustedPerson };
