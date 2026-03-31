const express = require('express');
const router = express.Router();
const controller = require('./controller');
const upload = require('./upload');

/**
 * @swagger
 * tags:
 *   name: SasanamBookDetails
 *   description: Sasanam Book Details management
 */

/**
 * @swagger
 * /sasanam-book-details:
 *   get:
 *     summary: Get all book details
 *     tags: [SasanamBookDetails]
 *     responses:
 *       200:
 *         description: List of book details
 */
router.get('/', controller.getAllBookDetails);

/**
 * @swagger
 * /sasanam-book-details/{id}:
 *   get:
 *     summary: Get book details by ID
 *     tags: [SasanamBookDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book details ID
 *     responses:
 *       200:
 *         description: Book details found
 *       404:
 *         description: Not found
 */
router.get('/:id', controller.getBookDetailsById);

/**
 * @swagger
 * /sasanam-book-details:
 *   post:
 *     summary: Create new book details
 *     tags: [SasanamBookDetails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookid:
 *                 type: string
 *               bookDetails:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 */
router.post('/', upload.single('file'), controller.createBookDetails);

/**
 * @swagger
 * /sasanam-book-details/{id}:
 *   put:
 *     summary: Update book details
 *     tags: [SasanamBookDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book details ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookid:
 *                 type: string
 *               bookDetails:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Not found
 */
router.put('/:id', controller.updateBookDetails);

/**
 * @swagger
 * /sasanam-book-details/{id}:
 *   delete:
 *     summary: Delete book details
 *     tags: [SasanamBookDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book details ID
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', controller.deleteBookDetails);

module.exports = router;
