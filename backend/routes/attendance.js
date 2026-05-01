const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const StudentAttendanceTracker = require('../models/StudentAttendanceTracker');
const User = require('../models/User');
const { protect, teacherOnly } = require('../middleware/auth');
const {
  normalizeDepartment,
  buildDepartmentFilter
} = require('../utils/department');

function sanitizeTrackerSubjects(subjects = []) {
  return subjects
    .filter(subject => subject && typeof subject.name === 'string')
    .map(subject => ({
      id: String(subject.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      name: subject.name.trim(),
      totalClasses: Math.max(0, Number(subject.totalClasses) || 0),
      attendedClasses: Math.max(0, Number(subject.attendedClasses) || 0)
    }))
    .filter(subject => subject.name);
}

// Get or create the current student's personal attendance tracker bucket
router.get('/tracker/:branch/:semester', protect, async (req, res) => {
  try {
    const branch = normalizeDepartment(req.params.branch);
    const semester = String(req.params.semester).trim();

    const tracker = await StudentAttendanceTracker.findOne({
      student: req.user._id,
      branch,
      semester
    }).lean();

    if (!tracker) {
      return res.json({ branch, semester, subjects: [] });
    }

    res.json({
      branch: tracker.branch,
      semester: tracker.semester,
      subjects: tracker.subjects || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Save the current student's personal attendance tracker bucket
router.put('/tracker/:branch/:semester', protect, async (req, res) => {
  try {
    const branch = normalizeDepartment(req.params.branch);
    const semester = String(req.params.semester).trim();
    const subjects = sanitizeTrackerSubjects(req.body.subjects);

    const tracker = await StudentAttendanceTracker.findOneAndUpdate(
      {
        student: req.user._id,
        branch,
        semester
      },
      {
        $set: {
          branch,
          semester,
          subjects
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    res.json({
      branch: tracker.branch,
      semester: tracker.semester,
      subjects: tracker.subjects || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my attendance (student)
router.get('/my', protect, async (req, res) => {
  try {
    const records = await Attendance.find({ student: req.user._id });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for a specific student (teacher or admin)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    if (req.user.role === 'student' && req.params.studentId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot view others attendance' });
    }
    const records = await Attendance.find({ student: req.params.studentId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class attendance summary for a subject (teacher)
router.get('/class/:department/:year/:subject', protect, teacherOnly, async (req, res) => {
  try {
    const { department, year, subject } = req.params;
    const records = await Attendance.find({
      department: buildDepartmentFilter(department),
      year,
      subject
    })
      .populate('student', 'name rollNo');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher marks attendance for a class
router.post('/mark', protect, teacherOnly, async (req, res) => {
  try {
    const { department, year, subject, date, presentStudents } = req.body;
    const normalizedDepartment = normalizeDepartment(department);
    // presentStudents = array of student IDs who are present

    const students = await User.find({
      department: buildDepartmentFilter(normalizedDepartment),
      year,
      role: 'student'
    });
    const attendanceDate = new Date(date);

    for (const student of students) {
      let record = await Attendance.findOne({ student: student._id, subject });

      if (!record) {
        record = new Attendance({
          student: student._id,
          subject,
          department: normalizedDepartment,
          year,
          records: [],
          totalClasses: 0,
          attendedClasses: 0
        });
      }

      const isPresent = presentStudents.includes(student._id.toString());
      record.records.push({ date: attendanceDate, status: isPresent ? 'present' : 'absent' });
      record.totalClasses += 1;
      if (isPresent) record.attendedClasses += 1;

      await record.save();
    }

    res.json({ message: 'Attendance marked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get 75% calculator stats for a student
router.get('/stats/:subject', protect, async (req, res) => {
  try {
    const record = await Attendance.findOne({
      student: req.user._id,
      subject: req.params.subject
    });

    if (!record) return res.status(404).json({ message: 'No attendance found for this subject' });

    const { totalClasses, attendedClasses } = record;
    const currentPct = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
    const target = 75;

    let result = {};
    if (currentPct < target) {
      // how many more to attend to reach 75%
      // (attendedClasses + x) / (totalClasses + x) = 0.75
      // attendedClasses + x = 0.75 * totalClasses + 0.75x
      // 0.25x = 0.75 * totalClasses - attendedClasses
      const needed = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
      result = {
        status: 'below',
        percentage: currentPct.toFixed(2),
        needToAttend: needed
      };
    } else {
      // how many can skip while staying >= 75%
      // (attendedClasses) / (totalClasses + x) >= 0.75
      // attendedClasses >= 0.75 * (totalClasses + x)
      // x <= attendedClasses/0.75 - totalClasses
      const canSkip = Math.floor(attendedClasses / 0.75 - totalClasses);
      result = {
        status: 'above',
        percentage: currentPct.toFixed(2),
        canSkip: Math.max(0, canSkip)
      };
    }

    result.totalClasses = totalClasses;
    result.attendedClasses = attendedClasses;
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
