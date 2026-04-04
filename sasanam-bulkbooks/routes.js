// Router for sasanma-bulkbooks

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { upload } = require('../utils/imageUpload');


/**
 * @swagger
 * tags:
 *   name: SasanmaBulkBooks
 *   description: Bulk Sasanam Books management
 */

/**
 * @swagger
 * /sasanma-bulkbooks:
 *   post:
 *     summary: Create a new bulk book
 *     tags: [SasanmaBulkBooks]
 *     security: [bearerAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SasanmaBulkBook'
 *     responses:
 *       201:
 *         description: Bulk book created
 *       400:
 *         description: Invalid input
 */
router.post(
  '/',
  upload.fields([
    { name: 'pdfFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  controller.createBulkBook
);

/**
 * @swagger
 * /sasanma-bulkbooks:
 *   get:
 *     summary: Get all bulk books
 *     tags: [SasanmaBulkBooks]
 *     security: [bearerAuth]
 *     responses:
 *       200:
 *         description: List of bulk books
 */
router.get('/', controller.getBulkBooks);

/**
 * @swagger
 * /sasanma-bulkbooks/{id}:
 *   get:
 *     summary: Get a bulk book by ID
 *     tags: [SasanmaBulkBooks]
 *     security: [bearerAuth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The bulk book ID
 *     responses:
 *       200:
 *         description: Bulk book data
 *       404:
 *         description: Not found
 */
router.get('/:id', controller.getBulkBookById);

/**
 * @swagger
 * /sasanma-bulkbooks/{id}:
 *   put:
 *     summary: Update a bulk book
 *     tags: [SasanmaBulkBooks]
 *     security: [bearerAuth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The bulk book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SasanmaBulkBook'
 *     responses:
 *       200:
 *         description: Bulk book updated
 *       404:
 *         description: Not found
 */
router.put('/:id', controller.updateBulkBook);

/**
 * @swagger
 * /sasanma-bulkbooks/{id}:
 *   delete:
 *     summary: Delete a bulk book
 *     tags: [SasanmaBulkBooks]
 *     security: [bearerAuth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The bulk book ID
 *     responses:
 *       200:
 *         description: Bulk book deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', controller.deleteBulkBook);

/**
 * @swagger
 * components:
 *   schemas:
 *     SasanmaBulkBook:
 *       type: object
 *       required:
 *         - bookName
 *         - authorName
 *         - sectionId
 *         - pdfFile
 *       properties:
 *         bookName:
 *           type: string
 *         authorName:
 *           type: string
 *         sectionId:
 *           type: string
 *           description: Section reference ID
 *         pdfFile:
 *           type: string
 *         coverImage:
 *           type: string
 *         description:
 *           type: string
 */

module.exports = router;
