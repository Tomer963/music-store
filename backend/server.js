import dotenv from "dotenv";
import {
  connectDatabase,
  closeDatabaseConnection,
} from "./src/config/database.js";
import app from "./src/app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT = 10000;

let server = null;
let isShuttingDown = false;

/**
 * validateEnvironment
 *
 * Validate required environment variables
 *
 * @throws {Error} If required variables are missing
 */
const validateEnvironment = () => {
  const required = ["MONGODB_URI", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

/**
 * setupKeepAlive
 *
 * Setup keep-alive logging in development mode
 */
const setupKeepAlive = () => {
  if (process.env.NODE_ENV === "development") {
    setInterval(() => {
      console.log(`Server is alive (${new Date().toLocaleTimeString()})`);
    }, 30000);
  }
};

/**
 * startServer
 *
 * Initialize database connection and start Express server
 *
 * @return {Promise<void>}
 */
const startServer = async () => {
  try {
    console.log("Starting server...");

    // Validate environment
    validateEnvironment();

    // Connect to database
    await connectDatabase();

    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log("Server started successfully");
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on("error", handleServerError);

    // Setup keep-alive
    setupKeepAlive();
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

/**
 * handleServerError
 *
 * Handle server-level errors
 *
 * @param {Error} error - Server error
 */
const handleServerError = (error) => {
  console.error("Server error:", error.message);

  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
    console.error("Please use a different port or stop the other process");
    process.exit(1);
  }

  if (error.code === "EACCES") {
    console.error(`Permission denied to bind to port ${PORT}`);
    console.error(
      "Try using a port number above 1024 or run with elevated privileges"
    );
    process.exit(1);
  }
};

/**
 * gracefulShutdown
 *
 * Handle graceful application shutdown
 *
 * @param {string} signal - Termination signal received
 * @return {Promise<void>}
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received. Initiating graceful shutdown...`);

  // Force shutdown after timeout
  const forceShutdownTimer = setTimeout(() => {
    console.error("Graceful shutdown timeout. Forcing shutdown...");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // Stop accepting new connections
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      console.log("HTTP server closed");
    }

    // Close database connection
    await closeDatabaseConnection();

    // Clear force shutdown timer
    clearTimeout(forceShutdownTimer);

    console.log("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error.message);
    clearTimeout(forceShutdownTimer);
    process.exit(1);
  }
};

/**
 * handleUncaughtException
 *
 * Handle uncaught exceptions
 *
 * @param {Error} error - Uncaught exception
 */
const handleUncaughtException = (error) => {
  console.error("Uncaught Exception:", error);
  console.error("Name:", error.name);
  console.error("Message:", error.message);
  console.error("Stack:", error.stack);

  gracefulShutdown("UNCAUGHT_EXCEPTION");
};

/**
 * handleUnhandledRejection
 *
 * Handle unhandled promise rejections
 *
 * @param {*} reason - Rejection reason
 * @param {Promise} promise - Promise that was rejected
 */
const handleUnhandledRejection = (reason, promise) => {
  console.error("Unhandled Rejection:");
  console.error("Promise:", promise);
  console.error("Reason:", reason);

  gracefulShutdown("UNHANDLED_REJECTION");
};

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions and rejections
process.on("uncaughtException", handleUncaughtException);
process.on("unhandledRejection", handleUnhandledRejection);

// Start the server
startServer();
