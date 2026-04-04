const express = require('express');
const mongoose = require('mongoose');
const makeArchiveItemModel = require('./schema');

const router = express.Router();

// GET /archive — public list of published archive items
router.get('/', async (req, res) => {
  try {
    const ArchiveItem = makeArchiveItemModel(mongoose);
    const items = await ArchiveItem.find({ isPublished: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('Get archive items error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
