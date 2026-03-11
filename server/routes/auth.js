const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { enforcePasswordPolicy } = require('../middleware/passwordPolicy');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', enforcePasswordPolicy, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'analyst'
    });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Audit log
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'USER_CREATED',
      details: { email: user.email, role: user.role },
      ipAddress: req.ip,
      result: 'success'
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & return token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }

    // Find user with password
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      await AuditLog.create({
        action: 'LOGIN',
        details: { username, reason: 'User not found' },
        ipAddress: req.ip,
        result: 'failure'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await AuditLog.create({
        userId: user._id,
        username: user.username,
        action: 'LOGIN',
        details: { reason: 'Invalid password' },
        ipAddress: req.ip,
        result: 'failure'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Audit log
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'LOGIN',
      ipAddress: req.ip,
      result: 'success'
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private

router.get('/me', protect, async (req, res) => {
  res.json({
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role
  });
});

module.exports = router;
