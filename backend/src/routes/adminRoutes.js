const express = require("express");
const {
  getAdminProfile,
  updateAdminProfile,
  getPendingCounsellors,
  updateCounsellorApproval,
  listManagedCounsellors,
  removeCounsellor,
  getOverview
} = require("../controllers/adminController");
const { getSummary, exportReport, listCounsellorsForFilter } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("admin"));
router.get("/overview", getOverview);
router.get("/profile", getAdminProfile);
router.patch("/profile", updateAdminProfile);
router.get("/counsellors/pending", getPendingCounsellors);
router.get("/counsellors", listCounsellorsForFilter);
router.get("/counsellors/all", listManagedCounsellors);
router.get("/reports/summary", getSummary);
router.get("/reports/export", exportReport);
router.patch("/counsellors/:id/status", updateCounsellorApproval);
router.delete("/counsellors/:id", removeCounsellor);

module.exports = router;
