const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/* ─────────────────────────────────────────
   Rate limiter: Login (brute-force protection)
   Max 10 attempts per 15 minutes per IP
   ───────────────────────────────────────── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true, // Don't count successful logins against limit
});

/* ─────────────────────────────────────────
   Rate limiter: Register (abuse protection)
   Max 5 registrations per hour per IP
   ───────────────────────────────────────── */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after an hour.',
  },
});

/* ─────────────────────────────────────────
   Validation Rules
   ───────────────────────────────────────── */
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),

  body('role')
    .optional()
    .isIn(['student', 'staff', 'admin']).withMessage('Role must be student, staff, or admin.'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

/* ─────────────────────────────────────────
   Routes
   ───────────────────────────────────────── */

// POST /api/auth/register
router.post('/register', registerLimiter, registerValidation, register);

// POST /api/auth/login
router.post('/login', loginLimiter, loginValidation, login);

// GET /api/auth/me  (protected)
router.get('/me', protect, getMe);

module.exports = router;
