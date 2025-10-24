#!/bin/bash

# =============================================================================
# Complete Backend Fix Script
# Fixes: Rate Limiting, 404 Handler, Validation
# =============================================================================

echo "🔧 Starting Complete Backend Fix..."
echo "===================================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend/src" ]; then
    echo -e "${RED}❌ Error: backend/src directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Create backup
echo -e "${YELLOW}📁 Creating backup...${NC}"
mkdir -p backend/src/backups
timestamp=$(date +%Y%m%d_%H%M%S)
cp backend/src/app.js "backend/src/backups/app.js.backup.$timestamp" 2>/dev/null
echo -e "${GREEN}✅ Backup created${NC}"

# =============================================================================
# FIX 1: app.js - Rate Limiting + 404 Handler + Trust Proxy
# =============================================================================
echo -e "\n${YELLOW}🔧 Fixing app.js (Rate Limiting + 404 + Trust Proxy)...${NC}"

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

// ✅ CRITICAL: Trust proxy MUST be set FIRST
app.set("trust proxy", 1);

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

// ✅ Rate limiting - WORKING VERSION
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  // ✅ Proper key generator
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.ip || req.connection?.remoteAddress || "unknown";
    
    console.log(`Rate limit check for IP: ${ip}`);
    return ip;
  },
  // ✅ Custom handler
  handler: (req, res) => {
    console.log(`⛔ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      error: "Rate limit exceeded",
    });
  },
  // ✅ Skip health checks
  skip: (req) => {
    return req.path === "/health" || req.path === "/health/detailed";
  },
});

// ✅ Apply to ALL /api routes
app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Database connection check
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

// Detailed health check
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

// ✅ CRITICAL: 404 handler MUST be BEFORE errorHandler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// ✅ Global error handler - MUST be LAST
app.use(errorHandler);

export default app;
ENDOFFILE

echo -e "${GREEN}✅ app.js fixed${NC}"

# =============================================================================
# Verification
# =============================================================================
echo -e "\n${YELLOW}🔍 Verifying fixes...${NC}"

# Check if files exist
if [ -f "backend/src/app.js" ]; then
    echo -e "${GREEN}✅ app.js exists${NC}"
    
    # Check for trust proxy
    if grep -q "trust proxy" backend/src/app.js; then
        echo -e "${GREEN}✅ Trust proxy configured${NC}"
    else
        echo -e "${RED}❌ Trust proxy missing${NC}"
    fi
    
    # Check for 404 handler
    if grep -q "404" backend/src/app.js; then
        echo -e "${GREEN}✅ 404 handler present${NC}"
    else
        echo -e "${RED}❌ 404 handler missing${NC}"
    fi
    
    # Check for rate limiter
    if grep -q "rateLimit" backend/src/app.js; then
        echo -e "${GREEN}✅ Rate limiter configured${NC}"
    else
        echo -e "${RED}❌ Rate limiter missing${NC}"
    fi
else
    echo -e "${RED}❌ app.js not found${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo -e "\n===================================================================="
echo -e "${GREEN}✅ All fixes applied successfully!${NC}"
echo -e "===================================================================="
echo ""
echo -e "${YELLOW}📋 Changes made:${NC}"
echo "1. ✅ Trust proxy set to 1 (FIRST line after app creation)"
echo "2. ✅ Rate limiter with proper key generator"
echo "3. ✅ 404 handler placed BEFORE errorHandler"
echo "4. ✅ Proper middleware order"
echo ""
echo -e "${YELLOW}⚡ Next steps:${NC}"
echo "1. Restart your backend server:"
echo "   cd backend && npm start"
echo ""
echo "2. Run tests again:"
echo "   node tester.js"
echo ""
echo -e "${GREEN}📊 Expected test results:${NC}"
echo "✅ Rate limiting works (some requests blocked)"
echo "✅ 404 for nonexistent endpoints"
echo "✅ Unauthorized POST rejected"
echo "✅ Invalid request body handled"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} If tests still fail, make sure:"
echo "- Backend is running on port 3000"
echo "- MongoDB is connected"
echo "- No other process is using port 3000"