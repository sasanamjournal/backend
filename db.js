const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGODB_URI;

let isConnected = false;

async function connect() {
  if (!uri) {
    throw new Error('Missing MongoDB configuration: set MONGODB_URI in the environment');
  }

  // Reuse existing connection if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,          // Connection pool: max 10 connections
      minPoolSize: 2,           // Keep at least 2 connections warm
      serverSelectionTimeoutMS: 5000,  // Fail fast if server unreachable
      socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000          // Initial connection timeout
    });
    isConnected = true;
    console.log('Connected to MongoDB (poolSize: 10)');
    return mongoose;
  } catch (err) {
    isConnected = false;
    if (err && err.message && /authentication failed|bad auth/i.test(err.message)) {
      console.error('MongoDB authentication failed. Verify your URI and credentials.');
    }
    console.error('MongoDB connection error:', err.message || err);
    throw err;
  }
}

module.exports = connect;
