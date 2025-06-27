/**
 * Main server file
 * Initializes the Express server and connects to MongoDB
 */

import express from "express";
import dotenv from "dotenv";
import { connectDatabase } from "./src/config/database.js";
import app from "./src/app.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 * First connects to database, then starts listening
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log("✅ Database connected successfully");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
startServer();
