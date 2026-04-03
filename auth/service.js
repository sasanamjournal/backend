const jwt = require('jsonwebtoken');
const connect = require('../db');
const mongoose = require('mongoose');
const makeUserModel = require('./schema');
const { sendWelcomeEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '10d';

const normalizeUsername = (username) => {
  return String(username || '').trim().toLowerCase();
};

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase();
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const signup = async (fullName, password, email) => {
  const normalizedFullname = normalizeUsername(fullName);
  const normalizedEmail = email ? normalizeEmail(email) : undefined;
  if (!normalizedEmail || !password) {
    return { error: 'email and password required', status: 400 };
  }
  if (normalizedFullname.length < 3 || normalizedFullname.length > 30) {
    return { error: 'fullName must be 3-30 characters', status: 400 };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { error: 'password must be at least 6 characters', status: 400 };
  }
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return { error: 'invalid email format', status: 400 };
  }

  await connect();
  const User = makeUserModel(mongoose);

  const existingUser = await User.findOne({ email: normalizedEmail }).exec();
  if (existingUser) {
    return { error: 'email already exists', status: 409 };
  }

  if (normalizedFullname) {
    const existingEmail = await User.findOne({ fullName: normalizedFullname }).exec();
    if (existingEmail) {
      return { error: 'fullName already exists', status: 409 };
    }
  }

  try {
    const user = new User({
      fullName: normalizedFullname,
      passwordHash: password,
      isSubscribed: false,
      email:normalizedEmail
    });
    await user.save();

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail({ email: normalizedEmail, name: normalizedFullname });

    return {
      success: true,
      status: 201,
    };
  } catch (err) {
    if (err && err.code === 11000) {
      return { error: 'user already exists', status: 409 };
    }
    throw err;
  }
};

const login = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) throw new Error('email and password required');

  await connect();
  const User = makeUserModel(mongoose);

  const user = await User.findOne({ email: normalizedEmail }).exec();
  
  if (!user) return { error: 'invalid credentials', status: 401 };
  const valid = await user.comparePassword(password);
  if (!valid) return { error: 'invalid credentials', status: 401 };
  const payload = { sub: user._id.toString(), username: user.email, role: user.role || 'user' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

  return {
    token,
    expiresIn: TOKEN_EXPIRES_IN,
    user: user.toJSON(),
    status: 200
  };
};

module.exports = { login, signup };
