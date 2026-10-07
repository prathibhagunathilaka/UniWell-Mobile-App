const express = require("express");
const { createCheckIn, getCheckIns, getCheckInTrend, getCheckInById } = require("../controllers/checkInController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Every check-in endpoint is limited to an authenticated student.
router.use(protect);
router.use(authorize("student"));

router.post("/", createCheckIn);
router.get("/trend", getCheckInTrend);
router.get("/", getCheckIns);
router.get("/:id", getCheckInById);

module.exports = router;
