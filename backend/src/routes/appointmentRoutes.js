const express = require("express");
const {
  createAvailability,
  deleteAvailability,
  bookAppointment,
  getStudentAppointments,
  getCounsellorAppointments,
  updateAppointmentStatus,
  getAppointmentById,
  cancelStudentAppointment,
  submitFeedback,
  exportStudentAppointmentCalendar,
  createAvailabilityBulk,
  getCounsellorAppointmentById
} = require("../controllers/appointmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Authentication is shared here; each route below applies its own role restriction.
router.use(protect);

router.post("/", authorize("student"), bookAppointment);
router.get("/mine", authorize("student"), getStudentAppointments);
router.get("/counsellor", authorize("counsellor"), getCounsellorAppointments);
router.get("/counsellor/:id", authorize("counsellor"), getCounsellorAppointmentById);
router.post("/availability/bulk", authorize("counsellor"), createAvailabilityBulk);
router.post("/availability", authorize("counsellor"), createAvailability);
router.delete("/availability/:id", authorize("counsellor"), deleteAvailability);
router.patch("/:id/status", authorize("counsellor"), updateAppointmentStatus);
router.patch("/:id/cancel", authorize("student"), cancelStudentAppointment);
router.post("/:id/feedback", authorize("student"), submitFeedback);
router.get("/:id/calendar", authorize("student"), exportStudentAppointmentCalendar);
router.get("/:id", authorize("student"), getAppointmentById);

module.exports = router;
