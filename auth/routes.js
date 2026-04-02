const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a new user and receive a JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created and JWT token returned
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 */
router.post('/signup', controller.signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive a JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', controller.login);

// ── Profile routes (require auth) ──
const { authenticateToken } = require('./middleware');
const mongoose = require('mongoose');
const makeUserModel = require('./schema');

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const user = await User.findById(req.user.sub).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if subscription has expired
    if (user.isSubscribed && user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
      await User.findByIdAndUpdate(user._id, { isSubscribed: false });
      user.isSubscribed = false;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Update profile (name, email)
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const { fullName, email } = req.body;
    const update = {};

    if (fullName !== undefined) {
      if (!fullName.trim() || fullName.trim().length < 3 || fullName.trim().length > 30) {
        return res.status(400).json({ error: 'Name must be 3-30 characters' });
      }
      update.fullName = fullName.trim().toLowerCase();
    }

    if (email !== undefined) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      // Check if email is taken by another user
      const existing = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: req.user.sub } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });
      update.email = email.trim().toLowerCase();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const user = await User.findByIdAndUpdate(req.user.sub, update, { new: true }).select('-passwordHash').lean();
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Name or email already taken' });
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;