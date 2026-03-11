const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

const router = express.Router();

// All admin routes require admin role
router.use(protect, authorize('admin'));

// @route   GET /api/admin/users
// @desc    List all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    const user = await User.create({ username, email, password, role: role || 'analyst' });
    await AuditLog.create({
      userId: req.user._id, username: req.user.username,
      action: 'USER_CREATED',
      details: { targetUser: username, role: role || 'analyst' },
      ipAddress: req.ip
    });
    res.status(201).json({ _id: user._id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user role or details
router.put('/users/:id', async (req, res) => {
  try {
    const { role, username, email } = req.body;
    const update = {};
    if (role) update.role = role;
    if (username) update.username = username;
    if (email) update.email = email;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    await AuditLog.create({
      userId: req.user._id, username: req.user.username,
      action: 'USER_UPDATED',
      details: { targetUser: user.username, changes: update },
      ipAddress: req.ip
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await AuditLog.create({
      userId: req.user._id, username: req.user.username,
      action: 'USER_DELETED',
      details: { targetUser: user.username },
      ipAddress: req.ip
    });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs with pagination and filters
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, username } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (username) filter.username = { $regex: username, $options: 'i' };
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
