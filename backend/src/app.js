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

// ========================================
// MIDDLEWARE ORDER (DO NOT CHANGE!)
// ========================================

// 1. Trust proxy FIRST
app.set("trust proxy", 1);

// 2. Security headers
app.use(helmet());

// 3. CORS
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

// 4. Body parsing BEFORE everything else
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 5. Development logging
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// 6. Database connection check
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

// 7. Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Music Store API",
    version: process.env.API_VERSION || "v1",
    endpoints: {
      health: "/health",
      api: `/api/${process.env.API_VERSION || "v1"}`,
    },
  });
});

// 8. Health endpoints
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

// 9. Rate limiting - CRITICAL FIX: Skip failed requests (401, 403, 404)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // ✅ KEY FIX: Don't count 4xx/5xx errors
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.ip || req.connection?.remoteAddress || "unknown";
    
    console.log(`Rate limit check for IP: ${ip}`);
    return ip;
  },
  handler: (req, res) => {
    console.log(`⛔ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      error: "Rate limit exceeded",
    });
  },
});

app.use("/api", limiter);

// 10. API routes
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/albums`, albumRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);

// 11. 404 handler (AFTER all routes)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// 12. Error handler (LAST)
app.use(errorHandler);

export default app;