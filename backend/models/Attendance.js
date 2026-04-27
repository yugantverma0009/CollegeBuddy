const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true }
});

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  records: [recordSchema],
  totalClasses: { type: Number, default: 0 },
  attendedClasses: { type: Number, default: 0 }
}, { timestamps: true });

attendanceSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
