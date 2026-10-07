const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      // Let the API start even when database-backed features are not configured.
      console.warn("MONGODB_URI is not configured. Skipping MongoDB connection.");
      return;
    }

    // Avoid unreachable DNS64 IPv6 addresses on this Windows network.
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
};

module.exports = connectDB;