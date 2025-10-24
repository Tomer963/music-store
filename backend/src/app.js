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

// 1. CRITICAL: Trust proxy MUST be set FIRST
app.set("trust proxy", 1);

// 2. Security headers
app.use(helmet());

// 3. CORS configuration
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

// 4. Body parsing (BEFORE rate limiting)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 5. Request logging (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// 6. ✅ FIXED: Rate limiting with draft-7 headers
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  
  // Different limits for dev vs production
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  
  // ✅ CRITICAL: Use 'draft-7' (string, not boolean)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  
  // ✅ Add this to ensure headers are sent
  requestWasSuccessful: (req, res) => res.statusCode < 400,
  
  // Proper IP extraction
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    
    let clientIp = ip;
    if (forwarded) {
      clientIp = forwarded.split(",")[0].trim();
    } else if (realIp) {
      clientIp = realIp;
    }
    
    clientIp = clientIp.replace(/^::ffff:/, "");
    
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 Rate limit key: ${clientIp}`);
    }
    
    return clientIp;
  },
  
  // Handler for rate limit exceeded
  handler: (req, res) => {
    const clientIp = req.ip?.replace(/^::ffff:/, "") || "unknown";
    const env = process.env.NODE_ENV || "development";
    const limit = env === "production" ? 100 : 1000;
    
    console.log(`⛔ Rate limit exceeded for IP: ${clientIp} (${env} mode: ${limit} req/15min)`);
    
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      error: "Rate limit exceeded",
      limit: limit,
      windowMs: 900,
      retryAfter: Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 900,
    });
  },
  
  // Skip rate limiting for health endpoints
  skip: (req) => {
    return req.path === "/health" || req.path === "/health/detailed";
  },
});

// 7. Apply rate limiter to ALL /api routes
app.use("/api", limiter);

// Log rate limiting configuration on startup
console.log(`🛡️  Rate Limiting: ${process.env.NODE_ENV === "production" ? "100" : "1000"} requests per 15 minutes`);
console.log(`🛡️  Rate Limit Headers: draft-7 standard`);

// 8. Database connection check
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

// 9. Root endpoint
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
    },
  });
});

// 10. Health check endpoints
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
    rateLimit: {
      enabled: true,
      max: process.env.NODE_ENV === "production" ? 100 : 1000,
      windowMs: "15 minutes",
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// 11. API routes
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/albums`, albumRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);

// 12. 404 handler MUST be BEFORE errorHandler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// 13. Global error handler - MUST be LAST
app.use(errorHandler);

export default app;