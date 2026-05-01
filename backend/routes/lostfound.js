const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const LostFound = require('../models/LostFound');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

function buildLostFoundPhotoUrl(postId) {
  return `/api/lostfound/${postId}/photo`;
}

// Get active posts
router.get('/', protect, async (req, res) => {
  try {
    const posts = await LostFound.find({ status: 'active' })
      .populate('postedBy', 'name')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
    posts.forEach(post => {
      if (post.photoData?.length) post.photo = buildLostFoundPhotoUrl(post._id);
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a lost & found post
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    const { description, foundAt, collectFrom, phone } = req.body;
    const post = await LostFound.create({
      photo: '',
      photoMimeType: req.file?.mimetype || '',
      photoData: req.file?.buffer || undefined,
      description, foundAt, collectFrom, phone,
      postedBy: req.user._id
    });
    if (req.file) {
      post.photo = buildLostFoundPhotoUrl(post._id);
      await post.save();
    }

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/photo', async (req, res) => {
  try {
    const post = await LostFound.findById(req.params.id).select('photo photoMimeType photoData');
    if (!post) return res.status(404).send('Not found');

    if (post.photoData?.length) {
      res.setHeader('Content-Type', post.photoMimeType || 'application/octet-stream');
      return res.send(post.photoData);
    }

    if (post.photo) {
      return res.redirect(post.photo);
    }

    res.status(404).send('Photo not found');
  } catch (err) {
    res.status(500).send('Server error');
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
