const mongoose = require('mongoose');

const trackerSubjectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  totalClasses: { type: Number, default: 0 },
  attendedClasses: { type: Number, default: 0 }
}, { _id: false });

const studentAttendanceTrackerSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branch: { type: String, required: true },
  semester: { type: String, required: true },
  subjects: { type: [trackerSubjectSchema], default: [] }
}, { timestamps: true });

studentAttendanceTrackerSchema.index({ student: 1, branch: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('StudentAttendanceTracker', studentAttendanceTrackerSchema);
