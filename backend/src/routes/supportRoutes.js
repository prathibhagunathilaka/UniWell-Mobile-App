const express = require("express");
const {
  getSupportContacts,
  getTrustedPeople,
  addTrustedPerson,
  updateTrustedPerson,
  deleteTrustedPerson
} = require("../controllers/supportController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/contacts", getSupportContacts);
router.use(protect, authorize("student"));
router.get("/trusted-people", getTrustedPeople);
router.post("/trusted-people", addTrustedPerson);
router.put("/trusted-people/:personId", updateTrustedPerson);
router.delete("/trusted-people/:personId", deleteTrustedPerson);

module.exports = router;
