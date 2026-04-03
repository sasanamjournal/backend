const crypto = require('crypto');
const mongoose = require('mongoose');
const makeUserModel = require('./schema');
const connect = require('../db');
const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// In-memory token store
const resetTokens = new Map();
const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens) {
    if (data.expires < now) resetTokens.delete(token);
  }
}, 5 * 60 * 1000);

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
  });
}

function addResetRoutes(router) {
  // Request password reset
  router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      await connect();
      const User = makeUserModel(mongoose);
      const user = await User.findOne({ email: email.trim().toLowerCase() }).exec();

      // Always return success (don't reveal if email exists)
      if (!user) return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });

      const token = crypto.randomBytes(32).toString('hex');
      resetTokens.set(token, { userId: user._id.toString(), expires: Date.now() + TOKEN_EXPIRY });

      const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

      const transporter = getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: `"Sasanam" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Reset your Sasanam password',
          html: `
            <div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:30px;">
              <h2 style="color:#8B4513;">Sasanam</h2>
              <p>Hi ${user.fullName},</p>
              <p>You requested a password reset. Click the button below to set a new password:</p>
              <a href="${resetLink}" style="display:inline-block;padding:12px 32px;background:#8B4513;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;">Reset Password</a>
              <p style="color:#6A5A4A;font-size:13px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
      }

      res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  // Reset password with token
  router.post('/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const data = resetTokens.get(token);
      if (!data || data.expires < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      }

      await connect();
      const User = makeUserModel(mongoose);
      const user = await User.findById(data.userId).exec();
      if (!user) return res.status(404).json({ error: 'User not found' });

      user.passwordHash = password;
      await user.save();

      resetTokens.delete(token);
      res.json({ success: true, message: 'Password has been reset. You can now login.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });
}

module.exports = { addResetRoutes };
