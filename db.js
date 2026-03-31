const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGODB_URI;

async function connect() {
  if (!uri) {
    throw new Error('Missing MongoDB configuration: set MONGODB_URI in the environment');
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    return mongoose;
  } catch (err) {
    if (err && err.message && /authentication failed|bad auth/i.test(err.message)) {
      console.error('MongoDB authentication failed. Verify your URI and credentials.');
    }
    console.error('MongoDB connection error:', err.message || err);
    throw err;
  }
}

module.exports = connect;
