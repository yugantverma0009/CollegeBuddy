const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  time: String,          // e.g. "09:00 - 10:00"
  subject: String,
  teacherName: String,
  group: { type: String, enum: ['ALL', 'G1', 'G2'], default: 'ALL' },
  room: String,
  status: { type: String, enum: ['normal', 'cancelled', 'rescheduled'], default: 'normal' },
  note: String           // info for cancel/reschedule
});

const dayScheduleSchema = new mongoose.Schema({
  day: String,
  periods: [periodSchema]
});

const timetableSchema = new mongoose.Schema({
  department: { type: String, required: true },
  year: { type: String, required: true },
  schedule: [dayScheduleSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// one timetable per dept+year combo
timetableSchema.index({ department: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
