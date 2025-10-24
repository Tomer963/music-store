#!/bin/bash

# Backend Fixes Script
# This script will fix all the failing tests

echo "🔧 Starting Backend Fixes..."
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Check if backend directory exists
if [ ! -d "backend/src" ]; then
    echo -e "${RED}❌ Error: backend/src directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${YELLOW}📁 Creating backups...${NC}"
mkdir -p backend/src/backups
cp backend/src/app.js backend/src/backups/app.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
cp backend/src/middleware/auth.js backend/src/backups/auth.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
cp backend/src/middleware/errorHandler.js backend/src/backups/errorHandler.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
check_status "Backups created"

# Fix 1: app.js - Rate Limiting + 404 Handler
echo -e "\n${YELLOW}🔧 Fixing app.js (Rate Limiting + 404)...${NC}"

cat > backend/src/app.js << 'ENDOFFILE'
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

// Trust proxy - CRITICAL for rate limiting to work
app.set('trust proxy', 1);

// Security headers
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

// Rate limiting - FIXED VERSION
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  // Custom key generator to properly identify clients
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           'unknown';
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      error: "Rate limit exceeded"
    });
  },
  // Skip health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/health/detailed';
  }
});

// Apply rate limiter to all /api routes
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

// Detailed health check endpoint
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

// 404 handler - MUST be before error handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler - MUST be last
app.use(errorHandler);

export default app;
ENDOFFILE

check_status "app.js fixed"

# Fix 2: middleware/auth.js
echo -e "\n${YELLOW}🔧 Fixing middleware/auth.js...${NC}"

cat > backend/src/middleware/auth.js << 'ENDOFFILE'
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { MESSAGES } from "../config/constants.js";

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
        error: "No authentication token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
        error: "Invalid or expired token",
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Token expired"
        : MESSAGES.ERROR.UNAUTHORIZED;

    return res.status(401).json({
      success: false,
      message,
      error: error.message,
    });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
      error: "Insufficient permissions",
    });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (user?.isActive) {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch {
    next();
  }
};
ENDOFFILE

check_status "auth.js fixed"

# Fix 3: middleware/errorHandler.js
echo -e "\n${YELLOW}🔧 Fixing middleware/errorHandler.js...${NC}"

cat > backend/src/middleware/errorHandler.js << 'ENDOFFILE'
import { MESSAGES } from "../config/constants.js";

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: MESSAGES.ERROR.VALIDATION_ERROR,
      errors,
      error: "Validation failed"
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      error: "Duplicate key error",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      error: err.message,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: err.message,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      error: err.message,
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || MESSAGES.ERROR.SERVER_ERROR,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
ENDOFFILE

check_status "errorHandler.js fixed"

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ All fixes applied successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart your backend server:"
echo "   cd backend && npm start"
echo ""
echo "2. Run tests:"
echo "   node tester.js"
echo ""
echo -e "${GREEN}Expected results:${NC}"
echo "✅ Rate limiting exists (some requests blocked)"
echo "✅ 404 for nonexistent endpoints"
echo "✅ Unauthorized POST rejected"
echo "✅ Invalid request body handled"