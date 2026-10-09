const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// eslint-disable-next-line import/no-unresolved

const User = require("../models/User");
const CheckIn = require("../models/CheckIn");
const userResponse = require("../utils/userResponse");
const {
  hasMailConfiguration,
  getMissingMailConfiguration,
  isSmtpReady,
  sendOtpEmail,
  maskEmail,
  safeSmtpErrorDetails,
  createOtpHash,
  createTokenHash,
  constantTimeEqual
} = require("../utils/authOtp");

const PROFILE_OTP_TTL_MS = 5 * 60 * 1000;
const PROFILE_TOKEN_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_INTERVAL_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const JWT_SECRET_REQUIRED_MESSAGE = "Authentication is not configured on the server.";

const clearProfileOtp = {
  profileOtpHash: 1,
  profileOtpAction: 1,
  profileOtpExpiresAt: 1,
  profileOtpSentAt: 1,
  profileOtpAttempts: 1
};

const clearProfileActionToken = {
  profileActionTokenHash: 1,
  profileActionTokenExpiresAt: 1
};

const requestProfileOtp = async (req, res) => {
  const action = req.body?.action;
  if (action !== "update" && action !== "delete") {
    return res.status(400).json({ message: "Choose a valid profile action." });
  }

  if (!hasMailConfiguration() || !process.env.JWT_SECRET) {
    const missingSettings = [
      ...getMissingMailConfiguration(),
      ...(!process.env.JWT_SECRET ? ["JWT_SECRET"] : [])
    ];
    return res.status(503).json({
      message: `Profile verification is not configured. Missing server settings: ${missingSettings.join(", ")}.`
    });
  }

  if (!isSmtpReady()) {
    return res.status(503).json({
      message: "Unable to send verification code. Please try again."
    });
  }

  try {
    const now = new Date();
    const user = await User.findOne({
      _id: req.user.id,
      role: "student",
      isActive: true,
      status: { $ne: "suspended" },
      $or: [
        { profileOtpSentAt: { $exists: false } },
        { profileOtpSentAt: { $lte: new Date(now.getTime() - OTP_RESEND_INTERVAL_MS) } }
      ]
    }).select("+profileOtpSentAt");

    if (!user) {
      return res.status(429).json({ message: "Please wait before requesting another verification code." });
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpHash = createOtpHash(user.email, `${action}:${otp}`);
    user.profileOtpHash = otpHash;
    user.profileOtpAction = action;
    user.profileOtpExpiresAt = new Date(now.getTime() + PROFILE_OTP_TTL_MS);
    user.profileOtpSentAt = now;
    user.profileOtpAttempts = 0;
    user.profileActionTokenHash = undefined;
    user.profileActionTokenExpiresAt = undefined;
    await user.save();

    try {
      await sendOtpEmail({
        recipient: user.email,
        type: "profile",
        otp,
        expiresInMinutes: PROFILE_OTP_TTL_MS / 60_000
      });
    } catch (mailError) {
      await User.updateOne(
        { _id: user._id, profileOtpHash: otpHash },
        { $unset: clearProfileOtp }
      );
      console.error("Profile verification email delivery failed:", {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        user: maskEmail(process.env.SMTP_USER),
        ...safeSmtpErrorDetails(mailError)
      });
      return res.status(503).json({ message: "Unable to send verification code. Please try again." });
    }

    return res.status(200).json({ message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Profile verification request failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to request profile verification right now." });
  }
};

const verifyProfileOtp = async (req, res) => {
  const action = req.body?.action;
  const otp = String(req.body?.otp || "").trim();
  if ((action !== "update" && action !== "delete") || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Enter the 6-digit code and requested account action." });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: JWT_SECRET_REQUIRED_MESSAGE });
  }

  try {
    const user = await User.findOne({
      _id: req.user.id,
      role: "student",
      isActive: true,
      profileOtpAction: action,
      profileOtpAttempts: { $lt: MAX_OTP_ATTEMPTS }
    }).select("+profileOtpHash +profileOtpAction +profileOtpExpiresAt +profileOtpAttempts");

    if (!user?.profileOtpHash) {
      return res.status(400).json({ message: "Invalid verification code." });
    }
    if (!user.profileOtpExpiresAt || user.profileOtpExpiresAt <= new Date()) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new code."
      });
    }
    if (user.profileOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ message: "Too many attempts. Please request a new code." });
    }

    const submittedHash = createOtpHash(user.email, `${action}:${otp}`);
    if (!constantTimeEqual(user.profileOtpHash, submittedHash)) {
      const attempted = await User.findOneAndUpdate(
        {
          _id: user._id,
          profileOtpHash: user.profileOtpHash,
          profileOtpAction: action,
          profileOtpExpiresAt: { $gt: new Date() },
          profileOtpAttempts: { $lt: MAX_OTP_ATTEMPTS }
        },
        { $inc: { profileOtpAttempts: 1 } },
        { new: true }
      ).select("+profileOtpAttempts");

      if (attempted && attempted.profileOtpAttempts >= MAX_OTP_ATTEMPTS) {
        await User.updateOne(
          { _id: user._id, profileOtpHash: user.profileOtpHash },
          { $unset: clearProfileOtp }
        );
      }
      return res.status(400).json({ message: "Invalid verification code." });
    }

    const verificationToken = jwt.sign(
      {
        id: user._id.toString(),
        purpose: "profile-action",
        action,
        jti: crypto.randomBytes(16).toString("hex")
      },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    const now = new Date();
    const claimed = await User.findOneAndUpdate(
      {
        _id: user._id,
        profileOtpHash: user.profileOtpHash,
        profileOtpAction: action,
        profileOtpExpiresAt: { $gt: now },
        profileOtpAttempts: { $lt: MAX_OTP_ATTEMPTS }
      },
      {
        $set: {
          profileActionTokenHash: createTokenHash(verificationToken),
          profileActionTokenExpiresAt: new Date(now.getTime() + PROFILE_TOKEN_TTL_MS)
        },
        $unset: clearProfileOtp
      },
      { new: true }
    );

    if (!claimed) {
      return res.status(400).json({ message: "The verification code is invalid or expired." });
    }

    return res.status(200).json({ message: "Verification successful.", verificationToken });
  } catch (error) {
    console.error("Profile verification failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to verify the code right now." });
  }
};

const validateActionToken = (verificationToken, action, userId) => {
  if (typeof verificationToken !== "string" || !verificationToken) {
    return null;
  }

  try {
    const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
    return decoded.purpose === "profile-action" &&
      decoded.action === action &&
      decoded.id === userId
      ? decoded
      : null;
  } catch (error) {
    return null;
  }
};

const consumeActionToken = async (userId, action, verificationToken, update) => {
  const decoded = validateActionToken(verificationToken, action, userId);
  if (!decoded) {
    return null;
  }

  const now = new Date();
  return User.findOneAndUpdate(
    {
      _id: userId,
      role: "student",
      isActive: true,
      status: { $ne: "suspended" },
      profileActionTokenHash: createTokenHash(verificationToken),
      profileActionTokenExpiresAt: { $gt: now }
    },
    {
      ...(update ? { $set: update } : {}),
      $unset: clearProfileActionToken
    },
    { new: true }
  );
};

const updateStudentProfile = async (req, res) => {
  const { verificationToken, ...changes } = req.body || {};
  const allowedFields = new Set(["name", "phoneNumber", "faculty", "year"]);
  const fields = Object.keys(changes);
  if (!fields.length || fields.some((field) => !allowedFields.has(field))) {
    return res.status(400).json({ message: "Update one or more supported profile fields only." });
  }

  const update = {};
  if (Object.hasOwn(changes, "name")) {
    if (typeof changes.name !== "string" || changes.name.trim().length < 2 || changes.name.trim().length > 100) {
      return res.status(400).json({ message: "Enter a valid name." });
    }
    update.name = changes.name.trim();
  }
  if (Object.hasOwn(changes, "phoneNumber")) {
    if (
      typeof changes.phoneNumber !== "string" ||
      !/^\+?[0-9().\-\s]{5,25}$/.test(changes.phoneNumber.trim()) ||
      (changes.phoneNumber.match(/\d/g) || []).length < 5
    ) {
      return res.status(400).json({ message: "Enter a valid phone number." });
    }
    update.phoneNumber = changes.phoneNumber.trim();
  }
  if (Object.hasOwn(changes, "faculty")) {
    if (typeof changes.faculty !== "string" || changes.faculty.trim().length < 1 || changes.faculty.trim().length > 120) {
      return res.status(400).json({ message: "Enter a valid faculty or school." });
    }
    update.faculty = changes.faculty.trim();
  }
  if (Object.hasOwn(changes, "year")) {
    const year = Number(changes.year);
    if (!Number.isInteger(year) || year < 1 || year > 12) {
      return res.status(400).json({ message: "Enter a valid year of study." });
    }
    update.year = year;
  }

  try {
    const user = await consumeActionToken(req.user.id, "update", verificationToken, update);
    if (!user) {
      return res.status(400).json({ message: "The verification is invalid or expired. Request a new code." });
    }
    return res.status(200).json({ message: "Profile updated successfully.", user: userResponse(user) });
  } catch (error) {
    console.error("Student profile update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update your profile right now." });
  }
};

const deleteStudentAccount = async (req, res) => {
  const { verificationToken } = req.body || {};
  const decoded = validateActionToken(verificationToken, "delete", req.user.id);
  if (!decoded) {
    return res.status(400).json({ message: "The verification is invalid or expired. Request a new code." });
  }

  const session = await mongoose.startSession();
  try {
    let deleted = false;
    await session.withTransaction(async () => {
      const user = await User.findOne({
        _id: req.user.id,
        role: "student",
        isActive: true,
        profileActionTokenHash: createTokenHash(verificationToken),
        profileActionTokenExpiresAt: { $gt: new Date() }
      }).session(session);

      if (!user) {
        return;
      }

      await CheckIn.deleteMany({ studentId: user._id }).session(session);
      const result = await User.deleteOne({
        _id: user._id,
        profileActionTokenHash: createTokenHash(verificationToken),
        profileActionTokenExpiresAt: { $gt: new Date() }
      }).session(session);

      if (result.deletedCount !== 1) {
        throw new Error("Account deletion did not complete.");
      }
      deleted = true;
    });

    if (!deleted) {
      return res.status(400).json({ message: "The verification is invalid or expired. Request a new code." });
    }
    return res.status(200).json({ message: "Your account and check-in history were deleted." });
  } catch (error) {
    console.error("Student account deletion failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to delete your account right now." });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  requestProfileOtp,
  verifyProfileOtp,
  updateStudentProfile,
  deleteStudentAccount
};
