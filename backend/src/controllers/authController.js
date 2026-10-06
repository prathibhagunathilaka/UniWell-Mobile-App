const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
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
const { consumeRegistrationVerification } = require("./registrationOtpController");

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const RESET_OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_INTERVAL_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPassword = (password) => PASSWORD_PATTERN.test(password);

const isValidPhoneNumber = (phoneNumber) =>
  typeof phoneNumber === "string" &&
  /^\+?[0-9().\-\s]{5,25}$/.test(phoneNumber.trim()) &&
  (phoneNumber.match(/\d/g) || []).length >= 5;

const signAccessToken = (user) => jwt.sign(
  {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    ver: user.tokenVersion
  },
  getJwtSecret(),
  {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  }
);

const sendAuthenticatedResponse = (res, user, statusCode = 200) => {
  const token = signAccessToken(user);

  return res.status(statusCode).json({
    message: statusCode === 201 ? "Registration successful." : "Login successful.",
    token,
    user: userResponse(user)
  });
};

const validateCommonRegistration = ({ name, email, phoneNumber, password }) => {
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    !isValidEmail(email) ||
    !isValidPhoneNumber(phoneNumber)
  ) {
    return "Enter a valid name, email, and phone number.";
  }

  if (typeof password !== "string" || !isValidPassword(password)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  }

  return null;
};

const handleDuplicateKey = (error, res) => {
  if (error.code !== 11000) {
    return false;
  }

  const field = Object.keys(error.keyPattern || {})[0];
  const message = field === "studentId"
    ? "That student ID is already registered."
    : "An account with that email already exists.";

  res.status(409).json({ message });
  return true;
};

const registerStudent = async (req, res) => {
  const { name, email, studentId, phoneNumber, faculty, year, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const validationError = validateCommonRegistration({
    name,
    email: normalizedEmail,
    phoneNumber,
    password
  });
  const parsedYear = Number(year);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (
    typeof studentId !== "string" ||
    studentId.trim().length < 2 ||
    studentId.trim().length > 50 ||
    typeof faculty !== "string" ||
    !faculty.trim() ||
    !Number.isInteger(parsedYear) ||
    parsedYear < 1 ||
    parsedYear > 12
  ) {
    return res.status(400).json({
      message: "Student ID, faculty, and a valid study year are required."
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      message: "Authentication is not configured on the server."
    });
  }

  try {
    const registrationVerified = await consumeRegistrationVerification(
      normalizedEmail,
      req.body?.verificationToken
    );
    if (!registrationVerified) {
      return res.status(400).json({
        message: "Verify your email address before creating an account."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: "student",
      status: "active",
      isActive: true,
      studentId: studentId.trim().toUpperCase(),
      phoneNumber: phoneNumber.trim(),
      faculty: faculty.trim(),
      year: parsedYear
    });

    return sendAuthenticatedResponse(res, user, 201);
  } catch (error) {
    if (handleDuplicateKey(error, res)) {
      return undefined;
    }

    console.error("Student registration failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to complete registration right now." });
  }
};

const registerCounsellor = async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    qualification,
    specialization,
    yearsOfExperience,
    password
  } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const validationError = validateCommonRegistration({
    name,
    email: normalizedEmail,
    phoneNumber,
    password
  });
  const years = Number(yearsOfExperience);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (
    typeof qualification !== "string" ||
    !qualification.trim() ||
    typeof specialization !== "string" ||
    !specialization.trim() ||
    !Number.isInteger(years) ||
    years < 0 ||
    years > 80
  ) {
    return res.status(400).json({
      message: "Qualification, specialization, and valid years of experience are required."
    });
  }

  try {
    const registrationVerified = await consumeRegistrationVerification(
      normalizedEmail,
      req.body?.verificationToken
    );
    if (!registrationVerified) {
      return res.status(400).json({
        message: "Verify your email address before submitting your registration."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: "counsellor",
      status: "pending",
      isActive: true,
      phoneNumber: phoneNumber.trim(),
      qualification: qualification.trim(),
      specialization: specialization.trim(),
      yearsOfExperience: years
    });

    return res.status(201).json({
      message: "Registration submitted. Your account is pending approval."
    });
  } catch (error) {
    if (handleDuplicateKey(error, res)) {
      return undefined;
    }

    console.error("Counsellor registration failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to complete registration right now." });
  }
};

const loginUser = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Enter a valid email and password." });
  }

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.isActive || user.status === "suspended") {
      return res.status(403).json({ message: "This account is not active." });
    }

    if (user.role === "counsellor" && user.status !== "active") {
      return res.status(403).json({ message: "Your counsellor account is pending approval." });
    }

    return sendAuthenticatedResponse(res, user);
  } catch (error) {
    console.error("Login failed:", error.code || error.name);
    const configurationError = error.message === "JWT_SECRET is not configured";
    return res.status(configurationError ? 503 : 500).json({
      message: configurationError
        ? "Authentication is not configured on the server."
        : "Unable to sign in right now."
    });
  }
};

const getCurrentUser = async (req, res) => {
  return res.status(200).json({ user: userResponse(req.userRecord) });
};

const resetRequestMessage = "If an account exists for this email, a verification code has been sent.";

const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (!hasMailConfiguration()) {
    return res.status(503).json({
      message: `Password recovery is not configured. Missing server settings: ${getMissingMailConfiguration().join(", ")}.`
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      message: "Password recovery is not configured. Missing server settings: JWT_SECRET."
    });
  }

  if (!isSmtpReady()) {
    return res.status(503).json({
      message: "Unable to send verification code. Please try again."
    });
  }

  try {
    const now = new Date();
    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    const otpHash = createOtpHash(email, otp);
    const user = await User.findOneAndUpdate(
      {
        email,
        isActive: { $ne: false },
        $or: [
          { passwordResetOtpSentAt: { $exists: false } },
          { passwordResetOtpSentAt: { $lte: new Date(now.getTime() - OTP_RESEND_INTERVAL_MS) } }
        ]
      },
      {
        $set: {
          passwordResetOtpHash: otpHash,
          passwordResetOtpExpiresAt: new Date(now.getTime() + RESET_OTP_TTL_MS),
          passwordResetOtpSentAt: now,
          passwordResetOtpAttempts: 0
        },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetTokenExpiresAt: 1
        }
      },
      { new: true }
    ).select("email");

    if (!user) {
      return res.status(200).json({ message: resetRequestMessage });
    }

    try {
      await sendOtpEmail({
        recipient: user.email,
        type: "password-reset",
        otp,
        expiresInMinutes: RESET_OTP_TTL_MS / 60_000
      });
    } catch (mailError) {
      await User.updateOne(
        { _id: user._id, passwordResetOtpHash: otpHash },
        {
          $unset: {
            passwordResetOtpHash: 1,
            passwordResetOtpExpiresAt: 1,
            passwordResetOtpSentAt: 1,
            passwordResetOtpAttempts: 1
          }
        }
      );
      console.error("Password reset email delivery failed:", {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        user: maskEmail(process.env.SMTP_USER),
        ...safeSmtpErrorDetails(mailError)
      });
      return res.status(503).json({ message: "Unable to send verification code. Please try again." });
    }

    return res.status(200).json({ message: resetRequestMessage });
  } catch (error) {
    console.error("Password reset request failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to process password recovery right now." });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Enter a valid email and 6-digit code." });
  }

  try {
    const user = await User.findOne({ email }).select(
      "+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts"
    );
    const now = new Date();

    if (
      !user ||
      !user.passwordResetOtpHash
    ) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    if (!user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt <= now) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new code."
      });
    }

    if (user.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ message: "Too many attempts. Please request a new code." });
    }

    const submittedHash = createOtpHash(email, otp);
    if (!constantTimeEqual(user.passwordResetOtpHash, submittedHash)) {
      const attempted = await User.findOneAndUpdate(
        {
          _id: user._id,
          passwordResetOtpHash: user.passwordResetOtpHash,
          passwordResetOtpExpiresAt: { $gt: now },
          passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS }
        },
        { $inc: { passwordResetOtpAttempts: 1 } },
        { new: true }
      ).select("+passwordResetOtpAttempts");

      if (attempted && attempted.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        await User.updateOne(
          { _id: user._id, passwordResetOtpHash: user.passwordResetOtpHash },
          { $unset: { passwordResetOtpHash: 1, passwordResetOtpExpiresAt: 1 } }
        );
      }
      return res.status(400).json({ message: "Invalid verification code." });
    }

    const resetToken = jwt.sign(
      {
        id: user._id.toString(),
        purpose: "password-reset",
        jti: crypto.randomBytes(16).toString("hex")
      },
      getJwtSecret(),
      { expiresIn: "10m" }
    );
    const resetTokenHash = createTokenHash(resetToken);
    const claimed = await User.findOneAndUpdate(
      {
        _id: user._id,
        passwordResetOtpHash: user.passwordResetOtpHash,
        passwordResetOtpExpiresAt: { $gt: now },
        passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS }
      },
      {
        $set: {
          passwordResetTokenHash: resetTokenHash,
          passwordResetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
        },
        $unset: {
          passwordResetOtpHash: 1,
          passwordResetOtpExpiresAt: 1,
          passwordResetOtpSentAt: 1,
          passwordResetOtpAttempts: 1
        }
      },
      { new: true }
    );

    if (!claimed) {
      return res.status(400).json({ message: "The verification code is invalid or expired." });
    }

    return res.status(200).json({
      message: "Verification successful.",
      resetToken
    });
  } catch (error) {
    console.error("Password reset code verification failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to verify the code right now." });
  }
};

const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body || {};

  if (typeof resetToken !== "string" || !resetToken || !isValidPassword(newPassword)) {
    return res.status(400).json({
      message: "Enter a valid reset session and a password with uppercase, lowercase, number, and special character."
    });
  }

  try {
    const decoded = jwt.verify(resetToken, getJwtSecret());
    if (decoded.purpose !== "password-reset" || typeof decoded.id !== "string") {
      return res.status(400).json({ message: "The password reset session is invalid or expired." });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updated = await User.findOneAndUpdate(
      {
        _id: decoded.id,
        passwordResetTokenHash: createTokenHash(resetToken),
        passwordResetTokenExpiresAt: { $gt: now }
      },
      {
        $set: { password: passwordHash },
        $inc: { tokenVersion: 1 },
        $unset: {
          passwordResetOtpHash: 1,
          passwordResetOtpExpiresAt: 1,
          passwordResetOtpSentAt: 1,
          passwordResetOtpAttempts: 1,
          passwordResetTokenHash: 1,
          passwordResetTokenExpiresAt: 1
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: "The password reset session is invalid or expired." });
    }

    return res.status(200).json({ message: "Password updated successfully. Please sign in again." });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "The password reset session is invalid or expired." });
    }

    console.error("Password reset failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update the password right now." });
  }
};

module.exports = {
  registerStudent,
  registerCounsellor,
  loginUser,
  getCurrentUser,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword
};
