const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const LostFound = require('../models/LostFound');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (req, file, cb) => cb(null, 'lf-' + Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// Get active posts
router.get('/', protect, async (req, res) => {
  try {
    const posts = await LostFound.find({ status: 'active' })
      .populate('postedBy', 'name')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a lost & found post
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    const { description, foundAt, collectFrom, phone } = req.body;
    const photo = req.file ? '/uploads/' + req.file.filename : '';

    const post = await LostFound.create({
      photo, description, foundAt, collectFrom, phone,
      postedBy: req.user._id
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment on a post
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const post = await LostFound.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ user: req.user._id, text: req.body.text });
    await post.save();
    res.json({ message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark as resolved - only poster can do this
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    const post = await LostFound.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    if (post.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only poster can mark as resolved' });
    }

    post.status = 'resolved';
    post.resolvedAt = new Date();
    await post.save();

    res.json({ message: 'Marked as resolved. Will auto-delete after 24 hours.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post (poster or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await LostFound.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    if (post.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
