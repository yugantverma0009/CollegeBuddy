const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, min: 1, max: 5 },
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const diningPlaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mapLink: { type: String },
  description: { type: String },
  photo: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviews: [reviewSchema],
  comments: [commentSchema],
  avgRating: { type: Number, default: 0 },
  firstReviewRewardGranted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('DiningPlace', diningPlaceSchema);
