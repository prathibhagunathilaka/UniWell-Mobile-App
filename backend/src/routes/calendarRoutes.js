const express = require("express");
const {
  getSyncStatus,
  rotateToken,
  disableFeed,
  exportCalendar,
  serveFeed
} = require("../controllers/calendarController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public, secret-token feed for Google Calendar / Apple Calendar / Outlook subscriptions.
router.get("/feed/:token", serveFeed);

router.use(protect, authorize("counsellor"));
router.get("/status", getSyncStatus);
router.post("/token", rotateToken);
router.delete("/token", disableFeed);
router.get("/export", exportCalendar);

module.exports = router;
