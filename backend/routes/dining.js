const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const DiningPlace = require('../models/DiningPlace');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const DINING_UPLOAD_POINTS = 4;
const DINING_FIRST_REVIEW_BONUS_POINTS = 4;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Images only'));
  }
});

function buildDiningPhotoUrl(placeId) {
  return `/api/dining/${placeId}/photo`;
}

// Get all dining places
router.get('/', protect, async (req, res) => {
  try {
    const places = await DiningPlace.find()
      .populate('uploadedBy', 'name')
      .populate('reviews.user', 'name')
      .populate('comments.user', 'name')
      .sort({ avgRating: -1 });
    places.forEach(place => {
      if (place.photoData?.length) place.photo = buildDiningPhotoUrl(place._id);
    });
    res.json(places);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a dining place
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const mapLink = String(req.body.mapLink || '').trim();
    const description = String(req.body.description || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Place name is required' });
    }

    const duplicateFilter = [
      { name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }
    ];
    if (mapLink) duplicateFilter.push({ mapLink });

    const existingPlace = await DiningPlace.findOne({ $or: duplicateFilter });
    if (existingPlace) {
      return res.status(409).json({ message: 'This dining place already exists. Add a review instead of uploading it again.' });
    }

    const place = await DiningPlace.create({
      name, mapLink, description, photo: '',
      photoMimeType: req.file?.mimetype || '',
      photoData: req.file?.buffer || undefined,
      uploadedBy: req.user._id
    });
    if (req.file) {
      place.photo = buildDiningPhotoUrl(place._id);
      await place.save();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: DINING_UPLOAD_POINTS } },
      { new: true }
    ).select('points');

    res.status(201).json({
      place,
      pointsAwarded: DINING_UPLOAD_POINTS,
      bonusHint: `Earn ${DINING_FIRST_REVIEW_BONUS_POINTS} more points when another student reviews it first.`,
      userPoints: updatedUser?.points || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/photo', async (req, res) => {
  try {
    const place = await DiningPlace.findById(req.params.id).select('photo photoMimeType photoData');
    if (!place) return res.status(404).send('Not found');

    if (place.photoData?.length) {
      res.setHeader('Content-Type', place.photoMimeType || 'application/octet-stream');
      return res.send(place.photoData);
    }

    if (place.photo) {
      return res.redirect(place.photo);
    }

    res.status(404).send('Photo not found');
  } catch (err) {
    res.status(500).send('Server error');
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

    let uploaderBonusAwarded = false;
    if (!place.firstReviewRewardGranted && String(place.uploadedBy) !== String(req.user._id)) {
      place.firstReviewRewardGranted = true;
      uploaderBonusAwarded = true;
      await User.findByIdAndUpdate(place.uploadedBy, {
        $inc: { points: DINING_FIRST_REVIEW_BONUS_POINTS }
      });
    }

    await place.save();

    // reward reviewer
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 3 } });

    res.json({
      message: 'Review added',
      avgRating: place.avgRating,
      uploaderBonusAwarded
    });
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
