/**
 * Create an admin user directly.
 * Usage: node admin/create-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('../db');
const makeUserModel = require('../auth/schema');

async function createAdmin() {
  try {
    await connect();
    const User = makeUserModel(mongoose);

    const email = 'admin@sasanam.in';
    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = 'admin';
      existing.canDownload = true;
      await User.updateOne({ _id: existing._id }, { $set: { role: 'admin', canDownload: true } });
      console.log(`User "${existing.fullName}" already exists — promoted to admin.`);
    } else {
      const user = new User({
        fullName: 'admin',
        email: email,
        passwordHash: 'test@123',
        role: 'admin',
        canDownload: true,
        isSubscribed: true,
      });
      await user.save();
      console.log(`Admin user created: ${email} / test@123`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

createAdmin();
