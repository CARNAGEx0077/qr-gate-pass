require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

/* ─────────────────────────────────────────
   Route Imports
   ───────────────────────────────────────── */
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

/* ─────────────────────────────────────────
   Connect to MongoDB
   ───────────────────────────────────────── */
connectDB();

/* ─────────────────────────────────────────
   Initialize Express App
   ───────────────────────────────────────── */
const app = express();

/* ─────────────────────────────────────────
   Security Middleware
   ───────────────────────────────────────── */

// Set secure HTTP headers
app.use(helmet());

// CORS — allow your frontend origin
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN === '*'
      ? '*'
      : process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: process.env.CLIENT_ORIGIN !== '*',
  })
);

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
app.use(globalLimiter);

/* ─────────────────────────────────────────
   Body Parsing
   ───────────────────────────────────────── */
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ─────────────────────────────────────────
   Health Check
   ───────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TKSCT Gate Pass API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/* ─────────────────────────────────────────
   API Routes
   ───────────────────────────────────────── */
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

/* ─────────────────────────────────────────
   404 Handler
   ───────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

/* ─────────────────────────────────────────
   Global Error Handler
   ───────────────────────────────────────── */
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: 'Validation error.', errors: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate field value.' });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  // Default 500
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

/* ─────────────────────────────────────────
   Start Server
   ───────────────────────────────────────── */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
