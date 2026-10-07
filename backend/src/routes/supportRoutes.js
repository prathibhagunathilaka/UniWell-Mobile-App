const express = require("express");
const {
  getSupportContacts,
  getTrustedPerson,
  saveTrustedPerson,
  deleteTrustedPerson
} = require("../controllers/supportController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
// Contact information is public; trusted-person records require student authentication.
router.get("/contacts", getSupportContacts);
router.use(protect, authorize("student"));
router.get("/trusted-person", getTrustedPerson);
router.put("/trusted-person", saveTrustedPerson);
router.delete("/trusted-person", deleteTrustedPerson);

module.exports = router;
