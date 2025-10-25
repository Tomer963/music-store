import mongoose from "mongoose";

let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;

/**
 * Database connection options
 */
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 120000,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  autoIndex: true,
  family: 4,
};

/**
 * setupConnectionHandlers
 *
 * Setup all mongoose connection event handlers
 */
const setupConnectionHandlers = () => {
  mongoose.connection.on("connected", () => {
    isConnected = true;
    reconnectAttempts = 0;
    console.log("Database connected successfully");
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on("error", (error) => {
    console.error("Database error:", error.message);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.log("Database disconnected");

    // Attempt reconnection if under max attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      attemptReconnection();
    } else {
      console.error(
        `Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`
      );
      console.error("Please check database connection and restart the server");
    }
  });

  mongoose.connection.on("reconnected", () => {
    isConnected = true;
    reconnectAttempts = 0;
    console.log("Database reconnected successfully");
  });
};

/**
 * attemptReconnection
 *
 * Attempt to reconnect to database with exponential backoff
 */
const attemptReconnection = () => {
  reconnectAttempts++;
  const delay = RECONNECT_INTERVAL * reconnectAttempts;

  console.log(
    `Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
  );
  console.log(`Waiting ${delay / 1000} seconds before retry...`);

  setTimeout(() => {
    mongoose
      .connect(process.env.MONGODB_URI, connectionOptions)
      .catch((error) => {
        console.error(
          `Reconnection attempt ${reconnectAttempts} failed:`,
          error.message
        );
      });
  }, delay);
};

/**
 * validateConnectionString
 *
 * Validate MongoDB connection string
 *
 * @throws {Error} If connection string is invalid
 */
const validateConnectionString = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (!process.env.MONGODB_URI.startsWith("mongodb")) {
    throw new Error("Invalid MongoDB connection string format");
  }
};

/**
 * connectDatabase
 *
 * Establish connection to MongoDB with automatic reconnection
 *
 * @return {Promise<void>}
 */
export const connectDatabase = async () => {
  try {
    // Validate configuration
    validateConnectionString();

    // Prevent duplicate connections
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log("Using existing database connection");
      return;
    }

    // Setup event handlers
    setupConnectionHandlers();

    // Configure mongoose
    mongoose.set("strictQuery", false);

    // Establish connection
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    isConnected = false;
    throw error;
  }
};

/**
 * closeDatabaseConnection
 *
 * Close MongoDB connection gracefully
 *
 * @return {Promise<void>}
 */
export const closeDatabaseConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      console.log("Closing database connection...");
      await mongoose.connection.close();
      isConnected = false;
      console.log("Database connection closed");
    }
  } catch (error) {
    console.error("Error closing database:", error.message);
    throw error;
  }
};

/**
 * checkDatabaseConnection
 *
 * Check if database is currently connected
 *
 * @return {boolean} True if connected
 */
export const checkDatabaseConnection = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * getDatabaseStatus
 *
 * Get detailed database connection status
 *
 * @return {Object} Database status information
 */
export const getDatabaseStatus = () => {
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    isConnected,
    state: stateMap[mongoose.connection.readyState] || "unknown",
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || "N/A",
    name: mongoose.connection.name || "N/A",
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  };
};
