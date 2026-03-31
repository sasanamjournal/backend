require('dotenv').config();
const connect = require('./db');
const mongoose = require('mongoose');
const makeUserModel = require('./auth/schema');

const fullName = process.env.SEED_FULLNAME || 'admin';
const email = process.env.SEED_EMAIL || 'admin@sasanam.com';
const password = process.env.SEED_PASSWORD || 'Password123!';

async function run() {
  try {
    await connect();
    const User = makeUserModel(mongoose);

    const existing = await User.findOne({ email }).exec();
    if (existing) {
      console.log('User already exists:', email);
      await mongoose.disconnect();
      process.exit(0);
    }

    const user = new User({ fullName, email, passwordHash: password, isSubscribed: false });
    await user.save();
    console.log('Seed user created successfully!');
    console.log('  Email:', email);
    console.log('  Password:', password);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
