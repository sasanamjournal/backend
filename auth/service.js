const jwt = require('jsonwebtoken');
const connect = require('../db');
const mongoose = require('mongoose');
const makeUserModel = require('./schema');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
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

const signup = async (username, password, email) => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = email ? normalizeEmail(email) : undefined;

  if (!normalizedUsername || !password) {
    return { error: 'username and password required', status: 400 };
  }
  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return { error: 'username must be 3-30 characters', status: 400 };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { error: 'password must be at least 6 characters', status: 400 };
  }
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return { error: 'invalid email format', status: 400 };
  }

  await connect();
  const User = makeUserModel(mongoose);

  const existingUser = await User.findOne({ username: normalizedUsername }).exec();
  if (existingUser) {
    return { error: 'username already exists', status: 409 };
  }

  if (normalizedEmail) {
    const existingEmail = await User.findOne({ email: normalizedEmail }).exec();
    if (existingEmail) {
      return { error: 'email already exists', status: 409 };
    }
  }

  try {
    const user = new User({
      username: normalizedUsername,
      passwordHash: password,
      isSubscribed: false,
      ...(normalizedEmail ? { email: normalizedEmail } : {})
    });
    await user.save();

    const payload = { sub: user._id.toString(), username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

    return {
      token,
      expiresIn: TOKEN_EXPIRES_IN,
      user: user.toJSON(),
      status: 201
    };
  } catch (err) {
    if (err && err.code === 11000) {
      return { error: 'user already exists', status: 409 };
    }
    throw err;
  }
};

const login = async (username, password) => {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !password) throw new Error('username and password required');

  await connect();
  const User = makeUserModel(mongoose);

  const user = await User.findOne({ username: normalizedUsername }).exec();
  if (!user) return { error: 'invalid credentials', status: 401 };

  const valid = await user.comparePassword(password);
  if (!valid) return { error: 'invalid credentials', status: 401 };

  const payload = { sub: user._id.toString(), username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

  return { token, expiresIn: TOKEN_EXPIRES_IN, user: user.toJSON(), status: 200 };
};

module.exports = { login, signup };
