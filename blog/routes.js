const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken } = require('../auth/middleware');

// Public routes
router.get('/', controller.getAll);
router.get('/:slug', controller.getBySlug);

// Admin routes (authenticated)
router.post('/', authenticateToken, controller.create);
router.put('/:id', authenticateToken, controller.update);
router.delete('/:id', authenticateToken, controller.remove);

module.exports = router;
