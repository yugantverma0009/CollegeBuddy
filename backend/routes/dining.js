const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const DiningPlace = require('../models/DiningPlace');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (req, file, cb) => cb(null, 'dining-' + Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Images only'));
  }
});

// Get all dining places
router.get('/', protect, async (req, res) => {
  try {
    const places = await DiningPlace.find()
      .populate('uploadedBy', 'name')
      .populate('reviews.user', 'name')
      .populate('comments.user', 'name')
      .sort({ avgRating: -1 });
    res.json(places);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a dining place
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    const { name, mapLink, description } = req.body;
    const photo = req.file ? '/uploads/' + req.file.filename : '';

    const place = await DiningPlace.create({
      name, mapLink, description, photo,
      uploadedBy: req.user._id
    });

    // reward the user
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });

    res.status(201).json(place);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a review with rating
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, text } = req.body;
    const place = await DiningPlace.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Place not found' });

    // check if user already reviewed
    const already = place.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ message: 'You already reviewed this place' });

    place.reviews.push({ user: req.user._id, rating, text });

    // recalculate avg rating
    const total = place.reviews.reduce((sum, r) => sum + r.rating, 0);
    place.avgRating = parseFloat((total / place.reviews.length).toFixed(1));

    await place.save();

    // reward reviewer
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 3 } });

    res.json({ message: 'Review added', avgRating: place.avgRating });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const place = await DiningPlace.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Not found' });

    place.comments.push({ user: req.user._id, text: req.body.text });
    await place.save();
    res.json({ message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete (uploader or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const place = await DiningPlace.findById(req.params.id);
    if (!place) return res.status(404).json({ message: 'Not found' });

    if (place.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await place.deleteOne();
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
