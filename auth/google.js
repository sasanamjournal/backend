const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const makeUserModel = require('./schema');
const connect = require('../db');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '10d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function setupGoogleAuth() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth not configured — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing');
    return;
  }

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const callbackURL = `${backendUrl}/auth/google/callback`;
  console.log('Google OAuth callback URL:', callbackURL);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      await connect();
      const User = makeUserModel(mongoose);

      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email) return done(null, false, { message: 'No email from Google' });

      let user = await User.findOne({ email }).exec();

      if (user) {
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
      } else {
        const name = (profile.displayName || email.split('@')[0])
          .toLowerCase().substring(0, 30);

        let fullName = name;
        const existing = await User.findOne({ fullName }).exec();
        if (existing) {
          fullName = `${name.substring(0, 24)}_${crypto.randomBytes(3).toString('hex')}`;
        }

        user = new User({
          fullName,
          email,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          googleId: profile.id,
          isSubscribed: false,
        });
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

function generateToken(user) {
  const payload = { sub: user._id.toString(), username: user.email, role: user.role || 'user' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

function addGoogleRoutes(router) {
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );

  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_failed` }),
    (req, res) => {
      const token = generateToken(req.user);
      const user = req.user.toJSON();
      const userData = encodeURIComponent(JSON.stringify(user));
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
    }
  );
}

module.exports = { setupGoogleAuth, addGoogleRoutes };
