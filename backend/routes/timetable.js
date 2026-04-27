const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { protect, crOnly, teacherOrCR } = require('../middleware/auth');
const {
  normalizeDepartment,
  buildDepartmentFilter,
  normalizeDepartmentField
} = require('../utils/department');

// Get timetable for a dept+year
router.get('/:department/:year', protect, async (req, res) => {
  try {
    const tt = await Timetable.findOne({
      department: buildDepartmentFilter(req.params.department),
      year: req.params.year
    }).populate('updatedBy', 'name');

    if (!tt) return res.status(404).json({ message: 'No timetable found for this class' });
    normalizeDepartmentField(tt);
    res.json(tt);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CR creates or replaces timetable
router.post('/', protect, crOnly, async (req, res) => {
  try {
    const { department, year, schedule } = req.body;
    const normalizedDepartment = normalizeDepartment(department);

    let tt = await Timetable.findOne({ department: buildDepartmentFilter(normalizedDepartment), year });
    if (tt) {
      tt.department = normalizedDepartment;
      tt.schedule = schedule;
      tt.updatedBy = req.user._id;
      await tt.save();
    } else {
      tt = await Timetable.create({
        department: normalizedDepartment,
        year,
        schedule,
        updatedBy: req.user._id
      });
    }
    normalizeDepartmentField(tt);

    res.json(tt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Teacher cancels or reschedules a specific period
router.put('/period/update', protect, teacherOrCR, async (req, res) => {
  try {
    const { department, year, day, time, subject, group, status, note } = req.body;

    const tt = await Timetable.findOne({
      department: buildDepartmentFilter(department),
      year
    });
    if (!tt) return res.status(404).json({ message: 'Timetable not found' });
    normalizeDepartmentField(tt);

    const daySchedule = tt.schedule.find(s => s.day === day);
    if (!daySchedule) return res.status(404).json({ message: 'Day not found in timetable' });

    const normalizedStatus = ['normal', 'cancelled', 'rescheduled'].includes(status) ? status : null;
    if (!normalizedStatus) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const period = daySchedule.periods.find((p) => {
      const sameTime = p.time === time;
      const sameSubject = subject ? p.subject === subject : true;
      const sameGroup = group ? (p.group || 'ALL') === group : true;
      return sameTime && sameSubject && sameGroup;
    });
    if (!period) return res.status(404).json({ message: 'Period not found' });

    period.status = normalizedStatus;
    period.note = normalizedStatus === 'normal' ? '' : (note || '');
    tt.updatedBy = req.user._id;
    await tt.save();

    const message = normalizedStatus === 'normal'
      ? 'Period restored to normal'
      : `Period marked as ${normalizedStatus}`;

    res.json({ message, period });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
