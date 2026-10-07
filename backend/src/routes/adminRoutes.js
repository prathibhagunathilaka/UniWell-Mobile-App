const express = require("express");
const {
  getPendingCounsellors,
  updateCounsellorApproval
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
// All admin endpoints in this router require an authenticated admin account.
router.use(protect, authorize("admin"));
router.get("/counsellors/pending", getPendingCounsellors);
router.patch("/counsellors/:id/status", updateCounsellorApproval);

module.exports = router;
