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
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:4200",
      "http://localhost:3000",
    ];

    // Allow requests with no origin (mobile apps, Postman)
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

// Rate limiting - ✅ תיקון: הגדרות נכונות
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // ✅ חשוב: לא לדלג על בקשות מוצלחות
  skipFailedRequests: false, // ✅ חשוב: לא לדלג על בקשות כושלות
});

app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Database connection check middleware
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

// API routes
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/albums`, albumRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Music Store API",
    version: process.env.API_VERSION || "v1",
    endpoints: {
      health: "/health",
      api: API_PREFIX,
    },
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;
  const status = isConnected ? "OK" : "DEGRADED";
  const code = isConnected ? 200 : 503;

  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(code).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: isConnected,
      state: dbStateMap[dbState] || "unknown",
      host: mongoose.connection.host || "N/A",
      name: mongoose.connection.name || "N/A",
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// Detailed health check endpoint (for monitoring)
app.get("/health/detailed", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;

  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: isConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    service: "music-store-backend",
    version: process.env.API_VERSION || "v1",
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
    database: {
      connected: isConnected,
      state: dbStateMap[dbState] || "unknown",
      host: mongoose.connection.host || "N/A",
      name: mongoose.connection.name || "N/A",
      models: Object.keys(mongoose.models),
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅ תיקון: 404 handler - חייב להיות לפני errorHandler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler - חייב להיות אחרון
app.use(errorHandler);

export default app;