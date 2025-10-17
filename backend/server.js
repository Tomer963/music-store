import dotenv from "dotenv";
import {
  connectDatabase,
  closeDatabaseConnection,
} from "./src/config/database.js";
import app from "./src/app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
let server = null;
let isShuttingDown = false;

/**
 * startServer
 * Initializes database connection and starts Express server
 * @return {Promise<void>}
 */
const startServer = async () => {
  try {
    await connectDatabase();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server error:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });

    // Keep alive message every 30 seconds in development
    if (process.env.NODE_ENV === "development") {
      setInterval(() => {
        console.log("💓 Server is alive...");
      }, 30000);
    }
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

/**
 * gracefulShutdown
 * Handles graceful application shutdown
 * @param {string} signal - Termination signal received
 * @return {void}
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      console.log("✅ HTTP server closed");

      try {
        // Close database connection
        await closeDatabaseConnection();
        console.log("✅ Database connection closed");
        console.log("👋 Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during shutdown:", error.message);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error("⚠️ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    await closeDatabaseConnection();
    process.exit(0);
  }
};

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start the server
startServer();