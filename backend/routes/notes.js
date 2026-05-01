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

const NOTE_UPLOAD_POINTS = 2;
const NOTE_FIRST_ACCESS_BONUS_POINTS = 3;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function awardFirstAccessBonus(note, accessorId) {
  if (note.firstAccessRewardGranted) return false;
  if (String(note.uploadedBy) === String(accessorId)) return false;

  note.firstAccessRewardGranted = true;
  await User.findByIdAndUpdate(note.uploadedBy, {
    $inc: { points: NOTE_FIRST_ACCESS_BONUS_POINTS }
  });
  return true;
}

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
    const title = String(req.body.title || '').trim();
    const subject = String(req.body.subject || '').trim();
    const description = String(req.body.description || '').trim();
    const department = normalizeDepartment(req.body.department || req.user.department);
    const year = req.body.year || req.user.year;
    const price = Number(req.body.price || 0);
    const fileUrl = req.file ? '/uploads/' + req.file.filename : '';

    if (!title || !subject) {
      return res.status(400).json({ message: 'Title and subject are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please attach a file before uploading a note' });
    }

    const duplicateNote = await Note.findOne({
      uploadedBy: req.user._id,
      department,
      year,
      title: { $regex: `^${escapeRegex(title)}$`, $options: 'i' },
      subject: { $regex: `^${escapeRegex(subject)}$`, $options: 'i' }
    });

    if (duplicateNote) {
      return res.status(409).json({ message: 'You already uploaded the same note for this class' });
    }

    const note = await Note.create({
      title, subject, description,
      fileUrl,
      uploadedBy: req.user._id,
      department,
      year,
      price: Number.isFinite(price) && price > 0 ? price : 0
    });
    normalizeDepartmentField(note);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: NOTE_UPLOAD_POINTS } },
      { new: true }
    ).select('points');

    res.status(201).json({
      note,
      pointsAwarded: NOTE_UPLOAD_POINTS,
      bonusHint: `Earn ${NOTE_FIRST_ACCESS_BONUS_POINTS} more points when another student unlocks it for the first time.`,
      userPoints: updatedUser?.points || 0
    });
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
    const alreadyBought = note.buyers.some((buyerId) => String(buyerId) === String(req.user._id));
    let uploaderBonusAwarded = false;

    // Already bought or free
    if (alreadyBought || note.price === 0) {
      if (!alreadyBought && String(note.uploadedBy) !== String(req.user._id)) {
        note.buyers.push(req.user._id);
      }
      note.downloads += 1;
      uploaderBonusAwarded = await awardFirstAccessBonus(note, req.user._id);
      await note.save();
      return res.json({
        message: 'Access granted',
        fileUrl: note.fileUrl,
        uploaderBonusAwarded,
        buyerPoints: null
      });
    }

    const buyer = await User.findById(req.user._id);
    if (buyer.points < note.price) {
      return res.status(400).json({ message: `Not enough points. Need ${note.price}, have ${buyer.points}` });
    }

    // deduct from buyer, give to uploader
    const updatedBuyer = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: -note.price } },
      { new: true }
    ).select('points');
    await User.findByIdAndUpdate(note.uploadedBy, { $inc: { points: note.price } });

    note.buyers.push(req.user._id);
    note.downloads += 1;
    uploaderBonusAwarded = await awardFirstAccessBonus(note, req.user._id);
    await note.save();

    res.json({
      message: 'Purchase successful',
      fileUrl: note.fileUrl,
      uploaderBonusAwarded,
      buyerPoints: updatedBuyer?.points || 0
    });
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
