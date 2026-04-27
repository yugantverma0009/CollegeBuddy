const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { normalizeDepartment, normalizeDepartmentField } = require('../utils/department');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Student self-registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department, year, rollNo, phone, dob } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name, email, password,
      role: 'student',
      department: normalizeDepartment(department), year, rollNo, phone,
      dob
    });
    normalizeDepartmentField(user);

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        points: user.points
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login - all roles
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    normalizeDepartmentField(user);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        points: user.points
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -cgpa');
    normalizeDepartmentField(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin creates teacher or CR account
router.post('/create-user', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department, year, phone } = req.body;

    if (!['teacher', 'cr', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Use teacher, cr, or admin' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: normalizeDepartment(department),
      year,
      phone
    });
    normalizeDepartmentField(user);

    res.status(201).json({
      message: `${role} account created`,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
