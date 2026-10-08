const express = require("express");
const {
  listCounsellors,
  getCounsellor,
  getAvailableSlots,
  updateCounsellorProfile
} = require("../controllers/counsellorController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", authorize("student"), listCounsellors);
router.get("/me", authorize("counsellor"), (req, res) => res.status(200).json({
  counsellor: {
    _id: req.userRecord._id,
    name: req.userRecord.name,
    email: req.userRecord.email,
    status: req.userRecord.status,
    phoneNumber: req.userRecord.phoneNumber || "",
    qualification: req.userRecord.qualification || "",
    specialization: req.userRecord.specialization || "",
    yearsOfExperience: req.userRecord.yearsOfExperience || 0
  }
}));
router.patch("/me", authorize("counsellor"), updateCounsellorProfile);
router.get("/:id/availability", authorize("student"), getAvailableSlots);
router.get("/:id", authorize("student"), getCounsellor);

module.exports = router;
