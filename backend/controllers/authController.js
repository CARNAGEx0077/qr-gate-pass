const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

/* ─────────────────────────────────────────
   Helper: Generate signed JWT
   ───────────────────────────────────────── */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'TKSCT-GatePass',
      audience: 'tksct-client',
    }
  );
};

/* ─────────────────────────────────────────
   Helper: Standard error response
   ───────────────────────────────────────── */
const errorResponse = (res, statusCode, message, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/* ─────────────────────────────────────────
   @route   POST /api/auth/register
   @desc    Register a new user
   @access  Public
   ───────────────────────────────────────── */
const register = async (req, res) => {
  // 1. Validate inputs
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return errorResponse(res, 422, 'Validation failed.', validationErrors.array());
  }

  const { username, email, password, role } = req.body;

  try {
    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 409, 'An account with this email already exists.');
    }

    // 3. Create user — password is hashed by the pre-save hook in User model
    const user = await User.create({ username, email, password, role });

    // 4. Generate token
    const token = generateToken(user);

    // 5. Respond (never return the password)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    // Mongoose duplicate key error
    if (error.code === 11000) {
      return errorResponse(res, 409, 'An account with this email already exists.');
    }
    console.error('Register Error:', error);
    return errorResponse(res, 500, 'Server error. Please try again later.');
  }
};

/* ─────────────────────────────────────────
   @route   POST /api/auth/login
   @desc    Authenticate user and return JWT
   @access  Public
   ───────────────────────────────────────── */
const login = async (req, res) => {
  // 1. Validate inputs
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return errorResponse(res, 422, 'Validation failed.', validationErrors.array());
  }

  const { email, password } = req.body;

  try {
    // 2. Find user by email — explicitly select password (it has select: false)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // 3. Generic 401 if user not found (don't reveal whether email exists)
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    // 4. Check if account is active
    if (!user.isActive) {
      return errorResponse(res, 403, 'Account is deactivated. Please contact the administrator.');
    }

    // 5. Compare password using bcrypt (NEVER compare plain text)
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    // 6. Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // 7. Generate JWT
    const token = generateToken(user);

    // 8. Respond with token and safe user object (no password)
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('Login Error:', error);
    return errorResponse(res, 500, 'Server error. Please try again later.');
  }
};

/* ─────────────────────────────────────────
   @route   GET /api/auth/me
   @desc    Get current logged-in user's profile
   @access  Private (requires JWT)
   ───────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return errorResponse(res, 500, 'Server error. Please try again later.');
  }
};

module.exports = { register, login, getMe };
