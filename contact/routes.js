const express = require('express');
const router = express.Router();
const ContactMessage = require('./schema');
const nodemailer = require('nodemailer');

// Public — submit a contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const contact = new ContactMessage({ name: name.trim(), email: email.trim(), message: message.trim() });
    await contact.save();
    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact submit error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
