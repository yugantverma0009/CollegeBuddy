const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const User = require('../models/User');
const { protect, crOnly } = require('../middleware/auth');
const {
  normalizeDepartment,
  buildDepartmentFilter,
  normalizeDepartmentField
} = require('../utils/department');

// Generate a teacher notification when threshold is reached
const generateTeacherMessage = (poll, yesCount) => {
  const crNote = poll.crDescription ? `\n\nAdditional note from CR: "${poll.crDescription}"` : '';
  return `Subject: Class Cancellation Request - ${poll.department} ${poll.year}

Dear Professor,

This is an automated notification from the College Buddy platform regarding today's classes.

A student poll titled "${poll.title}" was conducted among ${poll.totalStudents} students of ${poll.department} ${poll.year}. Out of ${poll.totalStudents} students, ${yesCount} have voted in favor of canceling the class.

This request has been submitted through the official class poll system after reaching the required threshold.${crNote}

We respectfully request your consideration.

Regards,
College Buddy System`;
};

// Get polls for current user's dept+year
router.get('/', protect, async (req, res) => {
  try {
    const { department, year } = req.query;
    let filter = {};
    if (department) filter.department = buildDepartmentFilter(department);
    if (year) filter.year = year;
    if (req.user.role === 'teacher') filter.sentToTeacher = true;

    const polls = await Poll.find(filter)
      .populate('createdBy', 'name')
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });
    polls.forEach(normalizeDepartmentField);

    res.json(polls);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single poll
router.get('/:id', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('teacher', 'name email')
      .populate('votes.user', 'name');
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    normalizeDepartmentField(poll);
    res.json(poll);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CR creates a poll
router.post('/', protect, crOnly, async (req, res) => {
  try {
    const { title, description, crDescription, department, year, teacher, threshold, totalStudents } = req.body;

    const poll = await Poll.create({
      title, description, crDescription,
      department: normalizeDepartment(department || req.user.department),
      year: year || req.user.year,
      createdBy: req.user._id,
      teacher: teacher || null,
      threshold: threshold || 35,
      totalStudents: totalStudents || 70
    });
    normalizeDepartmentField(poll);

    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Vote on a poll
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.status === 'closed') return res.status(400).json({ message: 'Poll is closed' });
    normalizeDepartmentField(poll);

    // check if already voted
    const alreadyVoted = poll.votes.find(v => v.user.toString() === req.user._id.toString());
    if (alreadyVoted) return res.status(400).json({ message: 'Already voted' });

    poll.votes.push({ user: req.user._id, vote: req.body.vote });
    await poll.save();

    // check if threshold reached and not sent yet
    const yesVotes = poll.votes.filter(v => v.vote === 'yes').length;
    if (yesVotes >= poll.threshold && !poll.sentToTeacher) {
      poll.teacherMessage = generateTeacherMessage(poll, yesVotes);
      poll.sentToTeacher = true;
      await poll.save();
    }

    res.json({
      message: 'Vote recorded',
      totalVotes: poll.votes.length,
      yesVotes,
      thresholdReached: yesVotes >= poll.threshold
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CR closes a poll
router.put('/:id/close', protect, crOnly, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Not found' });
    if (poll.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only CR who created this can close it' });
    }
    poll.status = 'closed';
    await poll.save();
    res.json({ message: 'Poll closed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
