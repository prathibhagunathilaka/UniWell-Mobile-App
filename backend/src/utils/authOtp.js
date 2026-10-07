const crypto = require("crypto");
const nodemailer = require("nodemailer");

const MAIL_CONFIGURATION_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM"
];

const getMissingMailConfiguration = () =>
  MAIL_CONFIGURATION_KEYS.filter((key) => !process.env[key]?.trim());

const hasMailConfiguration = () => getMissingMailConfiguration().length === 0;

const maskEmail = (email) => {
  if (typeof email !== "string") {
    return null;
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "configured (invalid email format)";
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
};

const normalizeEmailAddress = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const bracketedAddress = value.match(/<([^<>]+)>/);
  return (bracketedAddress ? bracketedAddress[1] : value).trim().toLowerCase();
};

const safeSmtpErrorDetails = (error) => {
  // Remove email addresses and configured secrets before logging SMTP responses.
  let response = typeof error?.response === "string"
    ? error.response.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    : undefined;
  if (response) {
    for (const secret of [
      process.env.SMTP_USER,
      process.env.SMTP_PASSWORD,
      process.env.MAIL_FROM,
      process.env.JWT_SECRET
    ]) {
      if (secret) response = response.split(secret).join("[redacted]");
    }
    response = response.slice(0, 500);
  }

  return {
    type: error?.name || "Error",
    code: error?.code,
    responseCode: error?.responseCode,
    command: error?.command,
    ...(response ? { response } : {})
  };
};

let mailer;
let mailerConfiguration;
let smtpVerified = false;

const createMailer = () => {
  if (!hasMailConfiguration()) {
    throw new Error("SMTP email service is not configured.");
  }

  const configuration = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASSWORD,
    process.env.MAIL_FROM
  ].join("\0");
  if (mailer && mailerConfiguration === configuration) {
    return mailer;
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }
  if (
    process.env.SMTP_HOST === "smtp.gmail.com" &&
    (port !== 587 || normalizeEmailAddress(process.env.SMTP_USER) !== normalizeEmailAddress(process.env.MAIL_FROM))
  ) {
    console.warn("Gmail SMTP is normally configured with port 587 and matching SMTP_USER/MAIL_FROM addresses.");
  }

  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
  mailerConfiguration = configuration;
  return mailer;
};

const verifySmtpConfiguration = async () => {
  const missing = getMissingMailConfiguration();
  if (missing.length) {
    smtpVerified = false;
    console.warn("SMTP email service is not configured. OTP emails cannot be sent.");
    console.warn(`Missing SMTP environment variables: ${missing.join(", ")}`);
    return false;
  }

  const port = Number(process.env.SMTP_PORT);
  console.info("Verifying SMTP configuration:", {
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    user: maskEmail(process.env.SMTP_USER),
    fromMatchesUser: normalizeEmailAddress(process.env.SMTP_USER) === normalizeEmailAddress(process.env.MAIL_FROM)
  });

  try {
    await createMailer().verify();
    smtpVerified = true;
    console.log("SMTP email service connected successfully.");
    return true;
  } catch (error) {
    smtpVerified = false;
    console.error("SMTP connection failed:", safeSmtpErrorDetails(error));
    return false;
  }
};

const isSmtpReady = () => smtpVerified;

const sendOtpEmail = async ({ recipient, type, otp, expiresInMinutes = 5 }) => {
  if (!["profile", "password-reset", "registration"].includes(type) || !/^\d{6}$/.test(otp)) {
    throw new Error("Invalid OTP email request.");
  }

  const subject = type === "profile"
    ? "UniWell Profile Verification Code"
    : type === "registration"
      ? "UniWell Email Verification Code"
      : "UniWell Password Reset Verification Code";
  const text = [
    "UniWell",
    "Your verification code is:",
    otp,
    `This code expires in ${expiresInMinutes} minutes.`,
    "If you did not request this code, you can ignore this email."
  ].join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#112E3C"><h1>UniWell</h1><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in ${expiresInMinutes} minutes.</p><p>If you did not request this code, you can ignore this email.</p></div>`;

  return createMailer().sendMail({
    from: process.env.MAIL_FROM,
    to: recipient,
    subject,
    text,
    html
  });
};

const createOtpHash = (email, otp) => crypto
  .createHmac("sha256", process.env.JWT_SECRET)
  .update(`${email}:${otp}`)
  .digest("hex");

const createTokenHash = (token) => crypto
  .createHmac("sha256", process.env.JWT_SECRET)
  .update(token)
  .digest("hex");

const constantTimeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

module.exports = {
  hasMailConfiguration,
  getMissingMailConfiguration,
  maskEmail,
  normalizeEmailAddress,
  safeSmtpErrorDetails,
  createMailer,
  verifySmtpConfiguration,
  isSmtpReady,
  sendOtpEmail,
  createOtpHash,
  createTokenHash,
  constantTimeEqual
};
