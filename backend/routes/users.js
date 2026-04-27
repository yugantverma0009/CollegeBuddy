const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const {
  normalizeDepartment,
  buildDepartmentFilter,
  normalizeDepartmentField
} = require('../utils/department');

// Get users - filter by dept/year
router.get('/', protect, async (req, res) => {
  try {
    const { department, year, role } = req.query;
    let filter = {};
    if (department) filter.department = buildDepartmentFilter(department);
    if (year) filter.year = year;
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password -cgpa')
      .sort({ name: 1 });
    users.forEach(normalizeDepartmentField);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user details
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -cgpa');
    if (!user) return res.status(404).json({ message: 'User not found' });
    normalizeDepartmentField(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - update user role or info
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { role, department, year, points } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, department: normalizeDepartment(department), year, points },
      { new: true }
    ).select('-password -cgpa');

    if (!user) return res.status(404).json({ message: 'User not found' });
    normalizeDepartmentField(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - delete user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
