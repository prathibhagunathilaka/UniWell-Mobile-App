require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const seedAdmin = async () => {
  // Startup seeding is deliberately limited to non-production environments.
  if (process.env.NODE_ENV === "production") {
    console.log("Admin startup seeding is disabled in production.");
    return;
  }

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const username = String(process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const email = String(ADMIN_EMAIL || "").trim().toLowerCase();

  if (!username && !ADMIN_PASSWORD && !ADMIN_EMAIL && !ADMIN_NAME) {
    console.warn("Admin account seeding is not configured; set ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD to enable it.");
    return;
  }

  if (
    !/^[a-z0-9._-]{3,32}$/.test(username) ||
    !ADMIN_NAME ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !passwordPattern.test(ADMIN_PASSWORD || "")
  ) {
    throw new Error("Set ADMIN_USERNAME, ADMIN_NAME, valid ADMIN_EMAIL, and a strong ADMIN_PASSWORD in the backend environment.");
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn("MongoDB is unavailable; the configured admin account was not created.");
    return;
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });
  if (existingUser) {
    if (
      existingUser.role !== "admin" ||
      existingUser.email !== email ||
      (existingUser.username && existingUser.username !== username)
    ) {
      throw new Error("The configured admin email or username conflicts with an existing account.");
    }

    if (!existingUser.username) {
      existingUser.username = username;
      await existingUser.save();
    }
    console.log("Configured admin account already exists.");
    return;
  }

  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    username,
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    role: "admin",
    status: "active",
    isActive: true
  });

  console.log("Admin account created.");
};

const createAdmin = async () => {
  await connectDB();
  await seedAdmin();
};

if (require.main === module) {
  createAdmin()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });
}

module.exports = { seedAdmin };
