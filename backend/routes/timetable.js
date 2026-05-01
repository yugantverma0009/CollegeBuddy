const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { protect, crOnly, teacherOnly, teacherOrCR } = require('../middleware/auth');
const {
  normalizeDepartment,
  buildDepartmentFilter,
  normalizeDepartmentField
} = require('../utils/department');

const VALID_GROUPS = ['ALL', 'G1', 'G2'];
const VALID_STATUSES = ['normal', 'cancelled', 'rescheduled'];

function sanitizePeriod(period = {}) {
  return {
    time: typeof period.time === 'string' ? period.time.trim() : '',
    subject: typeof period.subject === 'string' ? period.subject.trim() : '',
    teacherName: typeof period.teacherName === 'string' ? period.teacherName.trim() : '',
    group: VALID_GROUPS.includes(period.group) ? period.group : 'ALL',
    room: typeof period.room === 'string' ? period.room.trim() : '',
    isExtraClass: Boolean(period.isExtraClass),
    addedByTeacher: Boolean(period.addedByTeacher),
    status: VALID_STATUSES.includes(period.status) ? period.status : 'normal',
    note: typeof period.note === 'string' ? period.note.trim() : ''
  };
}

function sanitizeSchedule(schedule = []) {
  if (!Array.isArray(schedule)) return [];

  return schedule
    .map((dayEntry = {}) => {
      const day = typeof dayEntry.day === 'string' ? dayEntry.day.trim() : '';
      const periods = Array.isArray(dayEntry.periods)
        ? dayEntry.periods
          .map(sanitizePeriod)
          .filter((period) => period.time && period.subject)
        : [];

      return { day, periods };
    })
    .filter((dayEntry) => dayEntry.day);
}

function normalizeTimetableSchedule(tt) {
  if (!tt) return tt;
  tt.schedule = sanitizeSchedule(tt.schedule);
  return tt;
}

// Get timetable for a dept+year
router.get('/:department/:year', protect, async (req, res) => {
  try {
    const tt = await Timetable.findOne({
      department: buildDepartmentFilter(req.params.department),
      year: req.params.year
    }).populate('updatedBy', 'name role');

    if (!tt) return res.status(404).json({ message: 'No timetable found for this class' });
    normalizeDepartmentField(tt);
    normalizeTimetableSchedule(tt);
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
    const sanitizedSchedule = sanitizeSchedule(schedule);

    let tt = await Timetable.findOne({ department: buildDepartmentFilter(normalizedDepartment), year });
    if (tt) {
      tt.department = normalizedDepartment;
      tt.schedule = sanitizedSchedule;
      tt.updatedBy = req.user._id;
      await tt.save();
    } else {
      tt = await Timetable.create({
        department: normalizedDepartment,
        year,
        schedule: sanitizedSchedule,
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
router.post('/period/add', protect, teacherOnly, async (req, res) => {
  try {
    const {
      department,
      year,
      day,
      time,
      subject,
      teacherName,
      group,
      room
    } = req.body;

    if (!department || !year || !day || !time || !subject) {
      return res.status(400).json({ message: 'Department, year, day, time, and subject are required' });
    }

    const normalizedDepartment = normalizeDepartment(department);
    const normalizedGroup = VALID_GROUPS.includes(group) ? group : 'ALL';
    const normalizedTeacherName = teacherName || req.user.name;

    let tt = await Timetable.findOne({
      department: buildDepartmentFilter(normalizedDepartment),
      year
    });

    if (!tt) {
      tt = await Timetable.create({
        department: normalizedDepartment,
        year,
        schedule: [],
        updatedBy: req.user._id
      });
    }
    normalizeTimetableSchedule(tt);

    let daySchedule = tt.schedule.find((item) => item.day === day);
    if (!daySchedule) {
      daySchedule = { day, periods: [] };
      tt.schedule.push(daySchedule);
    }

    const duplicatePeriod = daySchedule.periods.find((period) => {
      return period.time === time
        && period.subject === subject
        && (period.group || 'ALL') === normalizedGroup;
    });

    if (duplicatePeriod) {
      return res.status(400).json({ message: 'This class already exists in the timetable' });
    }

    daySchedule.periods.push({
      time,
      subject,
      teacherName: normalizedTeacherName,
      group: normalizedGroup,
      room: room || '',
      isExtraClass: true,
      addedByTeacher: true,
      status: 'normal',
      note: ''
    });

    tt.updatedBy = req.user._id;
    await tt.save();
    normalizeDepartmentField(tt);

    res.status(201).json({ message: 'Class added successfully', timetable: tt });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
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
    normalizeTimetableSchedule(tt);

    const daySchedule = tt.schedule.find(s => s.day === day);
    if (!daySchedule) return res.status(404).json({ message: 'Day not found in timetable' });

    const normalizedStatus = VALID_STATUSES.includes(status) ? status : null;
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
