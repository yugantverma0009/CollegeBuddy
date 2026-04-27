const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Note = require('../models/Note');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  normalizeDepartment,
  buildDepartmentFilter,
  normalizeDepartmentField
} = require('../utils/department');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// Get all notes (filter by dept/year)
router.get('/', protect, async (req, res) => {
  try {
    const { department, year, subject } = req.query;
    let filter = {};
    if (department) filter.department = buildDepartmentFilter(department);
    if (year) filter.year = year;
    if (subject) filter.subject = new RegExp(subject, 'i');

    const notes = await Note.find(filter)
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 });
    notes.forEach(normalizeDepartmentField);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload a note
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, subject, description, department, year, price } = req.body;
    const fileUrl = req.file ? '/uploads/' + req.file.filename : '';

    const note = await Note.create({
      title, subject, description,
      fileUrl,
      uploadedBy: req.user._id,
      department: normalizeDepartment(department || req.user.department),
      year: year || req.user.year,
      price: price || 0
    });
    normalizeDepartmentField(note);

    // give uploader some points
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 5 } });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single note
router.get('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploadedBy', 'name')
      .populate('comments.user', 'name role');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    normalizeDepartmentField(note);
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    note.comments.push({ user: req.user._id, text });
    await note.save();
    res.json({ message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Buy/access a note
router.post('/:id/buy', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Already bought or free
    if (note.buyers.includes(req.user._id) || note.price === 0) {
      note.downloads += 1;
      await note.save();
      return res.json({ message: 'Access granted', fileUrl: note.fileUrl });
    }

    const buyer = await User.findById(req.user._id);
    if (buyer.points < note.price) {
      return res.status(400).json({ message: `Not enough points. Need ${note.price}, have ${buyer.points}` });
    }

    // deduct from buyer, give to uploader
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: -note.price } });
    await User.findByIdAndUpdate(note.uploadedBy, { $inc: { points: note.price } });

    note.buyers.push(req.user._id);
    note.downloads += 1;
    await note.save();

    res.json({ message: 'Purchase successful', fileUrl: note.fileUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete note (uploader or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Not found' });
    if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await note.deleteOne();
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
