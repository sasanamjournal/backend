const express = require('express');
const controller = require('./controller');
const { validateNewsBody, validateNewsQuery } = require('./middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UserNews
 *   description: User news APIs
 */

/**
 * @swagger
 * /user-news:
 *   get:
 *     summary: Get all published news (paginated)
 *     tags: [UserNews]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page (1-100)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of news items
 *       400:
 *         description: Validation error
 */
router.get('/', validateNewsQuery, controller.getAllNews);

/**
 * @swagger
 * /user-news/{id}:
 *   get:
 *     summary: Get a single news item by ID
 *     tags: [UserNews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: News item ID
 *     responses:
 *       200:
 *         description: News item
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: News not found
 */
router.get('/:id', controller.getNewsById);

/**
 * @swagger
 * /user-news:
 *   post:
 *     summary: Create a new news item
 *     tags: [UserNews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               author:
 *                 type: string
 *     responses:
 *       201:
 *         description: News item created
 *       400:
 *         description: Validation error
 */
router.post('/', validateNewsBody, controller.createNews);

/**
 * @swagger
 * /user-news/{id}:
 *   put:
 *     summary: Update a news item
 *     tags: [UserNews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               author:
 *                 type: string
 *     responses:
 *       200:
 *         description: News item updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: News not found
 */
router.put('/:id', controller.updateNews);

/**
 * @swagger
 * /user-news/{id}:
 *   delete:
 *     summary: Delete a news item
 *     tags: [UserNews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: News item deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: News not found
 */
router.delete('/:id', controller.deleteNews);

module.exports = router;
