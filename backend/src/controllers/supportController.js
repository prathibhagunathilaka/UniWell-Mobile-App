const mongoose = require("mongoose");
const User = require("../models/User");
const supportDirectory = require("../utils/supportDirectory");

const MAX_TRUSTED_PEOPLE = 5;

const getSupportContacts = (req, res) => {
  return res.status(200).json({
    universityPhone: process.env.UNIVERSITY_SUPPORT_PHONE || "",
    universityWebsite: process.env.UNIVERSITY_SUPPORT_URL || "",
    emergencyPhone: process.env.EMERGENCY_SUPPORT_PHONE || "",
    emergencyWebsite: process.env.EMERGENCY_SUPPORT_URL || "",
    directory: supportDirectory
  });
};

const cleanPerson = (body) => {
  const { name, phoneNumber, relationship } = body || {};
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
    return null;
  }
  return cleaned;
};

// Moves an old single `trustedPerson` into the `trustedPeople` array (one-time, per user).
const migrateLegacy = async (userId) => {
  const user = await User.findById(userId).select("trustedPerson trustedPeople");
  const legacy = user?.trustedPerson;
  if (!legacy?.name) return;
  const update = { $unset: { trustedPerson: 1 } };
  if (!user.trustedPeople?.length) {
    update.$push = {
      trustedPeople: {
        name: legacy.name,
        phoneNumber: legacy.phoneNumber || "",
        relationship: legacy.relationship || ""
      }
    };
  }
  await User.updateOne({ _id: userId }, update);
};

const loadPeople = async (userId) => {
  const user = await User.findById(userId).select("trustedPeople").lean();
  return user?.trustedPeople || [];
};

const getTrustedPeople = async (req, res) => {
  try {
    await migrateLegacy(req.user.id);
    return res.status(200).json({ trustedPeople: await loadPeople(req.user.id), max: MAX_TRUSTED_PEOPLE });
  } catch (error) {
    console.error("Trusted people lookup failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load your trusted people right now." });
  }
};

const addTrustedPerson = async (req, res) => {
  const cleaned = cleanPerson(req.body);
  if (!cleaned) {
    return res.status(400).json({ message: "Enter a name, relationship, and valid phone number." });
  }
  try {
    await migrateLegacy(req.user.id);
    // Atomic limit check: only push if there is no element at index MAX-1
    const updated = await User.findOneAndUpdate(
      { _id: req.user.id, [`trustedPeople.${MAX_TRUSTED_PEOPLE - 1}`]: { $exists: false } },
      { $push: { trustedPeople: cleaned } },
      { new: true, runValidators: true }
    ).select("trustedPeople");
    if (!updated) {
      return res.status(400).json({ message: `You can save up to ${MAX_TRUSTED_PEOPLE} trusted people.` });
    }
    return res.status(201).json({ trustedPeople: updated.trustedPeople });
  } catch (error) {
    console.error("Trusted person save failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to save your trusted person right now." });
  }
};

const updateTrustedPerson = async (req, res) => {
  const { personId } = req.params;
  if (!mongoose.isValidObjectId(personId)) {
    return res.status(400).json({ message: "Invalid trusted person." });
  }
  const cleaned = cleanPerson(req.body);
  if (!cleaned) {
    return res.status(400).json({ message: "Enter a name, relationship, and valid phone number." });
  }
  try {
    const updated = await User.findOneAndUpdate(
      { _id: req.user.id, "trustedPeople._id": personId },
      {
        $set: {
          "trustedPeople.$.name": cleaned.name,
          "trustedPeople.$.phoneNumber": cleaned.phoneNumber,
          "trustedPeople.$.relationship": cleaned.relationship
        }
      },
      { new: true, runValidators: true }
    ).select("trustedPeople");
    if (!updated) return res.status(404).json({ message: "Trusted person not found." });
    return res.status(200).json({ trustedPeople: updated.trustedPeople });
  } catch (error) {
    console.error("Trusted person update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update your trusted person right now." });
  }
};

const deleteTrustedPerson = async (req, res) => {
  const { personId } = req.params;
  if (!mongoose.isValidObjectId(personId)) {
    return res.status(400).json({ message: "Invalid trusted person." });
  }
  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { trustedPeople: { _id: personId } } },
      { new: true }
    ).select("trustedPeople");
    return res.status(200).json({ trustedPeople: updated?.trustedPeople || [] });
  } catch (error) {
    console.error("Trusted person removal failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to remove your trusted person right now." });
  }
};

module.exports = {
  getSupportContacts,
  getTrustedPeople,
  addTrustedPerson,
  updateTrustedPerson,
  deleteTrustedPerson
};
