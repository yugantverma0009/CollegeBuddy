const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'cr', 'student'],
    default: 'student'
  },
  department: {
    type: String,
    enum: ['CSE', 'ME', 'ECE', 'Civil', 'EE'],
    required: true
  },
  year: {
    type: String,
    enum: ['1Y', '2Y', '3Y', '4Y'],
  },
  rollNo: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  cgpa: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  points: {
    type: Number,
    default: 0
  },
  dob: {
    type: Date
  },
  address: {
    type: String
  },
  profilePic: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// hash pass before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
