#!/usr/bin/env node

/**
 * Automated Backend Fix Script
 * Fixes: Rate Limiting, 404 Handler, Error Handling
 * Usage: node fix-backend.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 Starting Automated Backend Fixes...\n');

// Check if backend directory exists
const appJsPath = path.join(process.cwd(), 'backend', 'src', 'app.js');
if (!fs.existsSync(appJsPath)) {
  console.error('❌ Error: backend/src/app.js not found');
  console.error('Please run this script from the project root directory');
  process.exit(1);
}

// Create backup
const backupDir = path.join(process.cwd(), 'backend', 'src', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('.')[0];
const backupPath = path.join(backupDir, `app.js.backup.${timestamp}`);
fs.copyFileSync(appJsPath, backupPath);
console.log('✅ Backup created:', path.basename(backupPath));

// Fixed app.js content
const fixedAppJs = `import express from "express";
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

// ✅ CRITICAL: Body parsing BEFORE rate limiting
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Rate limiting - AFTER body parsing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.ip || req.connection?.remoteAddress || "unknown";
    
    console.log(\`Rate limit check for IP: \${ip}\`);
    return ip;
  },
  handler: (req, res) => {
    console.log(\`⛔ Rate limit exceeded for IP: \${req.ip}\`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      error: "Rate limit exceeded",
    });
  },
  skip: (req) => {
    return req.path === "/health" || req.path === "/health/detailed";
  },
});

// ✅ Apply to ALL /api routes
app.use("/api", limiter);

// Request logging (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(\`\${new Date().toISOString()} - \${req.method} \${req.path}\`);
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
const API_PREFIX = \`/api/\${process.env.API_VERSION || "v1"}\`;

app.use(\`\${API_PREFIX}/albums\`, albumRoutes);
app.use(\`\${API_PREFIX}/categories\`, categoryRoutes);
app.use(\`\${API_PREFIX}/auth\`, authRoutes);
app.use(\`\${API_PREFIX}/cart\`, cartRoutes);
app.use(\`\${API_PREFIX}/orders\`, orderRoutes);
app.use(\`\${API_PREFIX}/wishlist\`, wishlistRoutes);

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
    error: \`Cannot \${req.method} \${req.originalUrl}\`,
  });
});

// ✅ CRITICAL: Global error handler - MUST be LAST
app.use(errorHandler);

export default app;
`;

// Write fixed file
fs.writeFileSync(appJsPath, fixedAppJs, 'utf8');
console.log('✅ Fixed app.js created\n');

console.log('================================================================');
console.log('✅ All fixes applied successfully!');
console.log('================================================================\n');
console.log('📋 Changes made:');
console.log('1. ✅ Body parsing moved BEFORE rate limiting');
console.log('2. ✅ 404 handler placed BEFORE error handler');
console.log('3. ✅ Trust proxy configured correctly');
console.log('4. ✅ Proper middleware order\n');
console.log('⚡ Next steps:');
console.log('1. Restart your backend server:');
console.log('   cd backend');
console.log('   npm start\n');
console.log('2. Run tests:');
console.log('   node tester.js\n');
console.log('📊 Expected results:');
console.log('✅ Rate limiting works (some requests blocked)');
console.log('✅ 404 for nonexistent endpoints');
console.log('✅ Unauthorized POST rejected');
console.log('✅ Invalid request body handled\n');