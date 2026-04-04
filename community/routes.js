const express = require('express');
const mongoose = require('mongoose');
const makeResourceCenterModel = require('./schema');

const router = express.Router();

// GET /community — public list of published resource centers
router.get('/', async (req, res) => {
  try {
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const centers = await ResourceCenter.find({ isPublished: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: centers });
  } catch (err) {
    console.error('Get resource centers error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
