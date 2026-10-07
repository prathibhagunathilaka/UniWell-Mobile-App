const express = require("express");
const {
  createAvailability,
  deleteAvailability,
  bookAppointment,
  getStudentAppointments,
  getCounsellorAppointments,
  updateAppointmentStatus,
  getAppointmentById
} = require("../controllers/appointmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Authentication is shared here; each route below applies its own role restriction.
router.use(protect);

router.post("/", authorize("student"), bookAppointment);
router.get("/mine", authorize("student"), getStudentAppointments);
router.get("/counsellor", authorize("counsellor"), getCounsellorAppointments);
router.post("/availability", authorize("counsellor"), createAvailability);
router.delete("/availability/:id", authorize("counsellor"), deleteAvailability);
router.patch("/:id/status", authorize("counsellor"), updateAppointmentStatus);
router.get("/:id", authorize("student"), getAppointmentById);

module.exports = router;
