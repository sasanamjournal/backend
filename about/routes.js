const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: About
 *   description: Team members and authors APIs
 */

/**
 * @swagger
 * /about/team:
 *   get:
 *     summary: Get all team members
 *     tags: [About]
 *     security: []
 *     responses:
 *       200:
 *         description: Team members fetched successfully
 */
router.get('/team', controller.getTeamMembers);

/**
 * @swagger
 * /about/team:
 *   post:
 *     summary: Add a team member
 *     tags: [About]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, role]
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               photo:
 *                 type: string
 *               bio:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Team member added
 */
router.post('/team', controller.addTeamMember);

/**
 * @swagger
 * /about/authors:
 *   get:
 *     summary: Get all authors
 *     tags: [About]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Authors fetched successfully
 */
router.get('/authors', controller.getAuthors);

/**
 * @swagger
 * /about/authors:
 *   post:
 *     summary: Add an author
 *     tags: [About]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, bookName]
 *             properties:
 *               name:
 *                 type: string
 *               photo:
 *                 type: string
 *               bookName:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Author added
 */
router.post('/authors', controller.addAuthor);

module.exports = router;
