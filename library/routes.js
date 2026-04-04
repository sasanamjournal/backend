const express = require('express');
const mongoose = require('mongoose');
const makeLibraryLinkModel = require('./schema');

const router = express.Router();

// GET /library — public list of published library links
router.get('/', async (req, res) => {
  try {
    const LibraryLink = makeLibraryLinkModel(mongoose);
    const links = await LibraryLink.find({ isPublished: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: links });
  } catch (err) {
    console.error('Get library links error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
