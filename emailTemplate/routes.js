const express = require('express');
const router = express.Router();
const EmailTemplate = require('./schema');

// GET all templates
router.get('/', async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ slug: 1 }).lean();
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('Get templates error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET single template by slug
router.get('/:slug', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ slug: req.params.slug }).lean();
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    console.error('Get template error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT update template by slug
router.put('/:slug', async (req, res) => {
  try {
    const allowed = ['name', 'subject', 'heading', 'body', 'buttonText', 'buttonUrl', 'fromName', 'isActive'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const template = await EmailTemplate.findOneAndUpdate(
      { slug: req.params.slug },
      updates,
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    console.error('Update template error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
