const express = require('express');
const mongoose = require('mongoose');
const makeResourceCenterModel = require('./schema');

const router = express.Router();

// GET /community — public list of published resource centers
router.get('/', async (req, res) => {
  try {
    const { deviceType, networkSpeed } = req.query;
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const centers = await ResourceCenter.find({ isPublished: true }).sort({ order: 1, createdAt: -1 }).lean();

    let resolution = 1080;
    if (deviceType === 'mobile') {
      resolution = 1080;
    } else {
      const speedStr = networkSpeed || '';
      if (speedStr.includes('Mbps')) {
        const speed = parseFloat(speedStr);
        if (!isNaN(speed)) {
          if (speed > 5) resolution = 1080;
          else if (speed >= 2) resolution = 640;
          else resolution = 360;
        }
      } else {
        switch(speedStr.toLowerCase()) {
          case '4g': resolution = 1080; break;
          case '3g': resolution = 640; break;
          case '2g': 
          case 'slow-2g': resolution = 360; break;
          default: resolution = 1080; break; 
        }
      }
    }

    const processedCenters = centers.map(c => {
      if (c.imageUrl) {
        try {
          const urlObj = new URL(c.imageUrl);
          urlObj.searchParams.set('w', resolution.toString());
          c.imageUrl = urlObj.toString();
        } catch(e) {
          if (c.imageUrl.includes('?')) {
            if (!c.imageUrl.includes('w=')) {
              c.imageUrl = `${c.imageUrl}&w=${resolution}`;
            }
          } else {
            c.imageUrl = `${c.imageUrl}?w=${resolution}`;
          }
        }
      }
      return c;
    });

    res.json({ success: true, data: processedCenters });
  } catch (err) {
    console.error('Get resource centers error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
