/**
 * Script to promote a user to admin role.
 * Usage: node admin/seed-admin.js <email>
 * Example: node admin/seed-admin.js admin@sasanam.com
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('../db');
const makeUserModel = require('../auth/schema');

async function seedAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node admin/seed-admin.js <email>');
    process.exit(1);
  }

  try {
    await connect();
    const User = makeUserModel(mongoose);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    const targetRole = process.argv[3] || 'super_admin';
    if (!['mentor', 'admin', 'super_admin'].includes(targetRole)) {
      console.error(`Invalid role "${targetRole}". Use: mentor, admin, or super_admin`);
      process.exit(1);
    }

    user.role = targetRole;
    user.canDownload = true;
    await user.save();

    console.log(`Successfully promoted "${user.fullName}" (${user.email}) to ${targetRole}.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
