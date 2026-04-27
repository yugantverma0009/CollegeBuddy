const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  name: { type: String }, // Breakfast, Lunch, Snacks, Dinner
  startTime: { type: String }, // "08:00"
  endTime: { type: String },   // "09:30"
  items: [String]
});

const messMenuSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
    unique: true
  },
  meals: [mealSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('MessMenu', messMenuSchema);
