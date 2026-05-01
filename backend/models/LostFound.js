const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const lostFoundSchema = new mongoose.Schema({
  photo: { type: String },
  photoMimeType: { type: String },
  photoData: { type: Buffer },
  description: { type: String, required: true },
  foundAt: { type: String, required: true },
  collectFrom: { type: String, required: true },
  phone: { type: String, required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  resolvedAt: { type: Date },
  comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('LostFound', lostFoundSchema);
