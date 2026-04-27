// Run this once to create the first admin account
// node seed.js

require('./dns-override');

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, tlsAllowInvalidCertificates: true });
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@college.edu' });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@college.edu',
    password: 'admin123',
    role: 'admin',
    department: 'CSE'
  });

  console.log('Admin created!');
  console.log('Email: admin@college.edu');
  console.log('Password: admin123');
  console.log('IMPORTANT: Change this password after first login!');

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
