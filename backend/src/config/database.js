/**
 * Database configuration and connection
 * Handles MongoDB connection using Mongoose
 */

import mongoose from "mongoose";

/**
 * Connect to MongoDB database
 * @returns {Promise} Database connection promise
 */
export const connectDatabase = async () => {
  try {
    const options = {
      useNewUrlParser:
        process.env.MONGODB_OPTIONS_USE_NEW_URL_PARSER === "true",
      useUnifiedTopology:
        process.env.MONGODB_OPTIONS_USE_UNIFIED_TOPOLOGY === "true",
    };

    await mongoose.connect(process.env.MONGODB_URI, options);

    // Connection event handlers
    mongoose.connection.on("connected", () => {
      console.log("📦 Mongoose connected to MongoDB");
    });

    // Log successful connection
    console.log("MongoDB connected to:", mongoose.connection.db.databaseName);

    mongoose.connection.on("error", (error) => {
      console.error("❌ Mongoose connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📦 Mongoose disconnected from MongoDB");
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
};

/**
 * Gracefully close database connection
 */
export const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log("📦 Database connection closed");
  } catch (error) {
    console.error("❌ Error closing database connection:", error);
  }
};
