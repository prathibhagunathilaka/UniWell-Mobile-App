const express = require("express");
const {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  registerPushToken,
  removePushToken
} = require("../controllers/notificationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("student", "counsellor"));

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/push-token", registerPushToken);
router.delete("/push-token", removePushToken);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;
