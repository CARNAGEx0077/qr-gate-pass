/**
 * Seed Script — Creates a test user in the database.
 * Run: node scripts/seedUser.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('✅ Connected to MongoDB');

    // Remove any existing test user
    await User.deleteOne({ email: 'student@tksct.edu' });

    // Create test user — password is hashed automatically by the pre-save hook
    const user = await User.create({
      username: 'Test Student',
      email: 'student@tksct.edu',
      password: 'Student@123', // Will be hashed before save
      role: 'student',
    });

    console.log('🌱 Seed user created:');
    console.log('   Email   :', user.email);
    console.log('   Password: Student@123');
    console.log('   Role    :', user.role);
    console.log('   ID      :', user._id.toString());

    await mongoose.disconnect();
    console.log('✅ Done. MongoDB disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedUser();
