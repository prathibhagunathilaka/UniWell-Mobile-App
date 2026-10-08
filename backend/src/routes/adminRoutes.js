const express = require("express");
const {
  getPendingCounsellors,
  updateCounsellorApproval
} = require("../controllers/adminController");
const { getSummary, exportReport, listCounsellorsForFilter } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("admin"));
router.get("/counsellors/pending", getPendingCounsellors);
router.get("/counsellors", listCounsellorsForFilter);
router.get("/reports/summary", getSummary);
router.get("/reports/export", exportReport);
router.patch("/counsellors/:id/status", updateCounsellorApproval);

module.exports = router;
