const express = require("express");
const {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} = require("../controllers/resourceController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// All resource reads and edits require authentication, with roles checked per route.
router.use(protect);

router.get("/", authorize("student", "counsellor"), getResources);
router.get("/:id", authorize("student", "counsellor"), getResourceById);
router.post("/", authorize("counsellor"), createResource);
router.patch("/:id", authorize("counsellor"), updateResource);
router.delete("/:id", authorize("counsellor"), deleteResource);

module.exports = router;
