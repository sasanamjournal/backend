const express = require('express');
const mongoose = require('mongoose');
const makeUserNewsModel = require('./schema');

const router = express.Router();

// GET /news — public list of published news items
router.get('/', async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      UserNews.find({ isPublished: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UserNews.countDocuments({ isPublished: true }),
    ]);

    res.json({ success: true, data: { news, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get public news error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
