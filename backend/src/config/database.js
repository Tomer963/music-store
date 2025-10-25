import mongoose from "mongoose";

let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * connectDatabase
 *
 * Establishes connection to MongoDB database with automatic reconnection and error handling
 *
 * @return {Promise<void>}
 */
export const connectDatabase = async () => {
  try {
    // Prevent multiple simultaneous connection attempts
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log("Using existing database connection");
      return;
    }

    const options = {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,

      // Timeout settings for stability
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 120000,
      connectTimeoutMS: 30000,

      // Heartbeat settings to keep connection alive
      heartbeatFrequencyMS: 10000,

      // Retry settings
      retryWrites: true,
      retryReads: true,

      // Additional stability options
      autoIndex: true,
      family: 4, // Use IPv4, skip IPv6
    };

    mongoose.set("strictQuery", false);

    // Connection event handlers
    mongoose.connection.on("connected", () => {
      isConnected = true;
      reconnectAttempts = 0;
      console.log("Database connected successfully");
    });

    mongoose.connection.on("error", (error) => {
      console.error("Database error:", error.message);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.log("Database disconnected");

      // Attempt to reconnect with exponential backoff
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(
          `Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
        );

        setTimeout(() => {
          mongoose.connect(process.env.MONGODB_URI, options).catch((err) => {
            console.error("Reconnection failed:", err.message);
          });
        }, 5000);
      } else {
        console.error(
          "Maximum reconnection attempts reached. Please restart the server.",
        );
      }
    });

    mongoose.connection.on("reconnected", () => {
      isConnected = true;
      reconnectAttempts = 0;
      console.log("Database reconnected successfully");
    });

    // Establish initial connection
    await mongoose.connect(process.env.MONGODB_URI, options);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    isConnected = false;
    throw error;
  }
};

/**
 * closeDatabaseConnection
 *
 * Closes the MongoDB connection gracefully
 *
 * @return {Promise<void>}
 */
export const closeDatabaseConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      isConnected = false;
      console.log("Database connection closed");
    }
  } catch (error) {
    console.error("Error closing database:", error.message);
  }
};

/**
 * checkDatabaseConnection
 *
 * Checks if database is currently connected
 *
 * @return {boolean} True if connected, false otherwise
 */
export const checkDatabaseConnection = () => {
  return mongoose.connection.readyState === 1;
};
