const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const checkInRoutes = require("./src/routes/checkInRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const counsellorRoutes = require("./src/routes/counsellorRoutes");
const appointmentRoutes = require("./src/routes/appointmentRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const supportRoutes = require("./src/routes/supportRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const calendarRoutes = require("./src/routes/calendarRoutes");
const { startReminderScheduler } = require("./src/utils/reminderScheduler");
const { seedResources } = require("./src/utils/seedResources");
const { verifySmtpConfiguration } = require("./src/utils/authOtp");
const { seedAdmin } = require("./src/utils/createAdmin");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});
app.use("/api/checkins", checkInRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/counsellors", counsellorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "UniWell Backend API is running"
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Complete service checks and seed data before accepting requests.
  await verifySmtpConfiguration();
  await connectDB();
  await seedResources();
  startReminderScheduler();
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();