import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import albumRoutes from "./routes/albums.js";
import categoryRoutes from "./routes/categories.js";
import authRoutes from "./routes/auth.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import wishlistRoutes from "./routes/wishlist.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { getClientIp } from "./utils/helpers.js";
import { getDatabaseStatus } from "./config/database.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:4200",
      "http://localhost:3000",
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-session-id"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging in development mode
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = getClientIp(req);
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
    next();
  });
}

/**
 * Configure rate limiter based on environment
 */
const createRateLimiter = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const maxRequests = isProduction ? 100 : 1000;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    requestWasSuccessful: (req, res) => res.statusCode < 400,
    keyGenerator: (req) => getClientIp(req),
    handler: (req, res) => {
      const clientIp = getClientIp(req);
      const retryAfter = Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 900;

      console.log(
        `⚠ Rate limit exceeded for IP: ${clientIp} (${process.env.NODE_ENV || "development"} mode: ${maxRequests} req/15min)`
      );

      res.status(429).json({
        success: false,
        message: "Too many requests, please try again later.",
        error: "Rate limit exceeded",
        limit: maxRequests,
        windowMs: windowMs / 1000,
        retryAfter,
      });
    },
    skip: (req) => {
      return req.path === "/health" || req.path === "/health/detailed";
    },
  });
};

app.use("/api", createRateLimiter());

console.log(
  `⚡ Rate Limiting: ${process.env.NODE_ENV === "production" ? "100" : "1000"} requests per 15 minutes`
);

/**
 * Database connection check middleware
 */
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database connection unavailable. Please try again later.",
      error: "Service temporarily unavailable",
    });
  }
  next();
});

/**
 * Root endpoint
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Music Store API",
    version: process.env.API_VERSION || "v1",
    environment: process.env.NODE_ENV || "development",
    rateLimit: {
      enabled: true,
      max: process.env.NODE_ENV === "production" ? 100 : 1000,
      windowMs: 900,
    },
    endpoints: {
      health: "/health",
      api: `/api/${process.env.API_VERSION || "v1"}`,
      docs: "/api/docs",
    },
  });
});

/**
 * Health check endpoints
 */
app.get("/health", (req, res) => {
  const dbStatus = getDatabaseStatus();
  const isHealthy = dbStatus.isConnected;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? "OK" : "DEGRADED",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      connected: dbStatus.isConnected,
      state: dbStatus.state,
    },
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health/detailed", (req, res) => {
  const dbStatus = getDatabaseStatus();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: dbStatus.isConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    service: "music-store-backend",
    version: process.env.API_VERSION || "v1",
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      unit: "MB",
    },
    database: {
      connected: dbStatus.isConnected,
      state: dbStatus.state,
      host: dbStatus.host,
      name: dbStatus.name,
      models: Object.keys(mongoose.models),
      reconnectAttempts: dbStatus.reconnectAttempts,
    },
    rateLimit: {
      enabled: true,
      max: process.env.NODE_ENV === "production" ? 100 : 1000,
      windowMs: "15 minutes",
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/albums`, albumRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;