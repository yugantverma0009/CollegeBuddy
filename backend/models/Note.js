const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String },
  fileOriginalName: { type: String },
  fileMimeType: { type: String },
  fileData: { type: Buffer },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  price: { type: Number, default: 0 },
  comments: [commentSchema],
  buyers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downloads: { type: Number, default: 0 },
  firstAccessRewardGranted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
