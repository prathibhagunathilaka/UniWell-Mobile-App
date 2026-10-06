require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const email = String(ADMIN_EMAIL || "").trim().toLowerCase();

  if (!ADMIN_NAME || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passwordPattern.test(ADMIN_PASSWORD || "")) {
    throw new Error("Set ADMIN_NAME, valid ADMIN_EMAIL, and a strong ADMIN_PASSWORD in the backend environment.");
  }

  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is unavailable; admin account was not created.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("An account already exists for ADMIN_EMAIL. No account was changed.");
  }

  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    role: "admin",
    status: "active",
    isActive: true
  });

  console.log("Admin account created.");
};

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
