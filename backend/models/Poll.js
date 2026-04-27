const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vote: { type: String, enum: ['yes', 'no'] }
});

const pollSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  crDescription: { type: String },
  department: { type: String, required: true },
  year: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  votes: [voteSchema],
  threshold: { type: Number, default: 35 },
  totalStudents: { type: Number, default: 70 },
  teacherMessage: { type: String, default: '' },
  sentToTeacher: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Poll', pollSchema);
