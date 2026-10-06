const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const RegistrationOtp = require("../models/RegistrationOtp");
const User = require("../models/User");
const {
  hasMailConfiguration,
  isSmtpReady,
  sendOtpEmail,
  createOtpHash,
  createTokenHash,
  constantTimeEqual,
  maskEmail,
  safeSmtpErrorDetails
} = require("../utils/authOtp");

const OTP_TTL_MS = 5 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const requestRegistrationOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: INVALID_EMAIL_MESSAGE });
  }
  if (!hasMailConfiguration() || !process.env.JWT_SECRET) {
    return res.status(503).json({ message: "OTP email verification is unavailable. Please try again later." });
  }
  if (!isSmtpReady()) {
    return res.status(503).json({ message: "Unable to send OTP. Please try again." });
  }

  const now = new Date();
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpHash = createOtpHash(email, `registration:${otp}`);
  let challenge;

  try {
    challenge = await RegistrationOtp.findOneAndUpdate(
      {
        email,
        $or: [
          { sentAt: { $exists: false } },
          { sentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
          { expiresAt: { $lte: now } }
        ]
      },
      {
        $set: {
          otpHash,
          expiresAt: new Date(now.getTime() + OTP_TTL_MS),
          sentAt: now,
          attempts: 0,
          verifiedAt: null,
          documentExpiresAt: new Date(now.getTime() + OTP_TTL_MS)
        },
        $unset: {
          verificationTokenHash: 1,
          verificationTokenExpiresAt: 1
        },
        $setOnInsert: { email }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).select("+otpHash");
  } catch (error) {
    if (error.code === 11000) {
      const current = await RegistrationOtp.findOne({ email }).select("sentAt");
      if (!current) {
        return res.status(503).json({ message: "Unable to send OTP. Please try again." });
      }
      const seconds = Math.max(
        1,
        Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - current.sentAt.getTime())) / 1000)
      );
      return res.status(429).json({
        message: "Please wait before requesting another OTP.",
        retryAfterSeconds: seconds
      });
    }
    console.error("Registration OTP request failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to send OTP. Please try again." });
  }

  try {
    await sendOtpEmail({
      recipient: email,
      type: "registration",
      otp,
      expiresInMinutes: OTP_TTL_MS / 60_000
    });
    return res.status(200).json({
      message: "OTP sent successfully.",
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendAfterSeconds: RESEND_COOLDOWN_MS / 1000
    });
  } catch (error) {
    await RegistrationOtp.deleteOne({ _id: challenge._id, otpHash });
    console.error("Registration OTP email failed:", {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: maskEmail(process.env.SMTP_USER),
      ...safeSmtpErrorDetails(error)
    });
    return res.status(503).json({ message: "Unable to send OTP. Please try again." });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Enter a valid email and 6-digit OTP." });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: "OTP verification is unavailable. Please try again later." });
  }

  try {
    const challenge = await RegistrationOtp.findOne({ email })
      .select("+otpHash +verificationTokenHash");
    if (!challenge?.otpHash) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }
    const now = new Date();
    if (!challenge.expiresAt || challenge.expiresAt <= now) {
      return res.status(400).json({ message: "OTP has expired. Please request a new code." });
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const submittedHash = createOtpHash(email, `registration:${otp}`);
    if (!constantTimeEqual(submittedHash, challenge.otpHash)) {
      const attempt = await RegistrationOtp.findOneAndUpdate(
        {
          _id: challenge._id,
          otpHash: challenge.otpHash,
          expiresAt: { $gt: now },
          attempts: { $lt: MAX_ATTEMPTS }
        },
        { $inc: { attempts: 1 } },
        { new: true }
      ).select("attempts");
      if (attempt?.attempts >= MAX_ATTEMPTS) {
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
      }
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    const verificationToken = jwt.sign(
      {
        purpose: "email-registration",
        email,
        nonce: crypto.randomBytes(16).toString("hex")
      },
      process.env.JWT_SECRET,
      { expiresIn: `${VERIFICATION_TOKEN_TTL_MS / 1000}s` }
    );
    const tokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    const claimed = await RegistrationOtp.findOneAndUpdate(
      {
        _id: challenge._id,
        otpHash: challenge.otpHash,
        expiresAt: { $gt: now },
        attempts: { $lt: MAX_ATTEMPTS }
      },
      {
        $set: {
          verificationTokenHash: createTokenHash(verificationToken),
          verificationTokenExpiresAt: tokenExpiresAt,
          verifiedAt: now,
          documentExpiresAt: tokenExpiresAt
        },
        $unset: { otpHash: 1, expiresAt: 1 }
      }
    );
    if (!claimed) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    return res.status(200).json({
      message: "OTP verified successfully.",
      verificationToken
    });
  } catch (error) {
    console.error("Registration OTP verification failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to verify OTP. Please try again." });
  }
};

const consumeRegistrationVerification = async (email, token) => {
  if (typeof token !== "string" || !token || !process.env.JWT_SECRET) {
    return false;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "email-registration" || decoded.email !== email) {
      return false;
    }
    const consumed = await RegistrationOtp.findOneAndDelete({
      email,
      verificationTokenHash: createTokenHash(token),
      verificationTokenExpiresAt: { $gt: new Date() }
    });
    return Boolean(consumed);
  } catch {
    return false;
  }
};

module.exports = {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  consumeRegistrationVerification
};
