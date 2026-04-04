const express = require('express');
const mongoose = require('mongoose');
const makeSiteSettingsModel = require('./schema');

const router = express.Router();

// GET /site-settings — public, returns launch state
router.get('/', async (req, res) => {
  try {
    const SiteSettings = makeSiteSettingsModel(mongoose);
    let settings = await SiteSettings.findOne({ key: 'main' }).lean();
    if (!settings) {
      settings = { isLive: false, launchDate: null };
    }
    res.json({ success: true, data: { isLive: settings.isLive, launchDate: settings.launchDate } });
  } catch (err) {
    console.error('Get site settings error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
