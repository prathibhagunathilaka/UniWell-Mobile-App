const express = require("express");
const { ipKeyGenerator, rateLimit } = require("express-rate-limit");
const {
  registerStudent,
  registerCounsellor,
  loginUser,
  loginAdmin,
  getCurrentUser,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword
} = require("../controllers/authController");
const {
  requestProfileOtp,
  verifyProfileOtp,
  updateStudentProfile,
  deleteStudentAccount
} = require("../controllers/profileController");
const {
  requestRegistrationOtp,
  verifyRegistrationOtp
} = require("../controllers/registrationOtpController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

const createLimiter = (limit, windowMs, message) => rateLimit({
  windowMs,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message }
});

const registrationLimiter = createLimiter(
  8,
  60 * 60 * 1000,
  "Too many registration attempts. Please try again later."
);
const registrationOtpRequestLimiter = createLimiter(
  8,
  60 * 60 * 1000,
  "Too many verification code requests. Please try again later."
);
const registrationOtpVerifyLimiter = createLimiter(
  10,
  15 * 60 * 1000,
  "Too many verification attempts. Please request a new code later."
);
const loginIpLimiter = createLimiter(
  60,
  15 * 60 * 1000,
  "Too many sign-in attempts from this network. Please try again later."
);
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? "").trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}:${identifier || "unknown"}`;
  },
  message: { message: "Too many sign-in attempts for this account. Please try again later." }
});
const resetRequestLimiter = createLimiter(
  5,
  15 * 60 * 1000,
  "Too many password reset requests. Please try again later."
);
const resetVerificationLimiter = createLimiter(
  10,
  15 * 60 * 1000,
  "Too many verification attempts. Please request a new code later."
);
const resetPasswordLimiter = createLimiter(
  5,
  15 * 60 * 1000,
  "Too many password update attempts. Please try again later."
);
const profileOtpRequestLimiter = createLimiter(
  5,
  15 * 60 * 1000,
  "Too many profile verification requests. Please try again later."
);
const profileOtpVerifyLimiter = createLimiter(
  10,
  15 * 60 * 1000,
  "Too many verification attempts. Please request a new code later."
);
const profileActionLimiter = createLimiter(
  5,
  15 * 60 * 1000,
  "Too many profile changes. Please try again later."
);

router.post("/register", registrationLimiter, registerStudent);
router.post("/register/student", registrationLimiter, registerStudent);
router.post("/register/counsellor", registrationLimiter, registerCounsellor);
router.post("/register/request-otp", registrationOtpRequestLimiter, requestRegistrationOtp);
router.post("/register/verify-otp", registrationOtpVerifyLimiter, verifyRegistrationOtp);
router.post("/login", loginIpLimiter, loginAccountLimiter, loginUser);
router.post("/admin/login", loginIpLimiter, loginAccountLimiter, loginAdmin);
router.get("/me", protect, getCurrentUser);
router.post("/profile/request-otp", profileOtpRequestLimiter, protect, authorize("student"), requestProfileOtp);
router.post("/profile/verify-otp", profileOtpVerifyLimiter, protect, authorize("student"), verifyProfileOtp);
router.patch("/profile", profileActionLimiter, protect, authorize("student"), updateStudentProfile);
router.delete("/profile", profileActionLimiter, protect, authorize("student"), deleteStudentAccount);
router.post("/forgot-password", resetRequestLimiter, requestPasswordReset);
router.post("/verify-otp", resetVerificationLimiter, verifyPasswordResetOtp);
router.post("/reset-password", resetPasswordLimiter, resetPassword);

module.exports = router;
