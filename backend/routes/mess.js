const express = require('express');
const router = express.Router();
const MessMenu = require('../models/MessMenu');
const { protect, crOnly } = require('../middleware/auth');

// Get all days menu
router.get('/', protect, async (req, res) => {
  try {
    const menus = await MessMenu.find().populate('updatedBy', 'name').sort({ day: 1 });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's menu
router.get('/today', protect, async (req, res) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const menu = await MessMenu.findOne({ day: today }).populate('updatedBy', 'name');
    if (!menu) return res.status(404).json({ message: 'No menu for today' });
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CR creates or updates a day's menu
router.post('/', protect, crOnly, async (req, res) => {
  try {
    const { day, meals } = req.body;

    let menu = await MessMenu.findOne({ day });
    if (menu) {
      menu.meals = meals;
      menu.updatedBy = req.user._id;
      await menu.save();
    } else {
      menu = await MessMenu.create({ day, meals, updatedBy: req.user._id });
    }
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CR deletes a day menu
router.delete('/:day', protect, crOnly, async (req, res) => {
  try {
    await MessMenu.findOneAndDelete({ day: req.params.day });
    res.json({ message: 'Menu removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
