const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const router = express.Router();
const controller = require('./controller');
const makeUserModel = require('../auth/schema');
const makeRoleModel = require('../auth/roleSchema');

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Book management
 */

/**
 * @swagger
 * /sasanam-books:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookName
 *               - authorName
 *               - sectionId
 *             properties:
 *               bookName:
 *                 type: string
 *               authorName:
 *                 type: string
 *               sectionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', controller.validateCreateBook, controller.createBook);

/**
 * @swagger
 * /sasanam-books:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max number of books
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         description: Number of books to skip
 *     responses:
 *       200:
 *         description: List of books
 */
router.get('/', controller.getAllBooks);

/**
 * @swagger
 * /sasanam-books/{id}:
 *   get:
 *     summary: Get a book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book found
 *       404:
 *         description: Book not found
 */
router.get('/:id', controller.getBookById);

/**
 * @swagger
 * /sasanam-books/{id}:
 *   put:
 *     summary: Update a book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookName:
 *                 type: string
 *               authorName:
 *                 type: string
 *               sectionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       404:
 *         description: Book not found
 */
router.put('/:id', controller.validateUpdateBook, controller.updateBook);

/**
 * @swagger
 * /sasanam-books/{id}:
 *   delete:
 *     summary: Delete a book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       404:
 *         description: Book not found
 */
router.delete('/:id', controller.deleteBook);

// ═══════════════════════════════════════════
// DOWNLOAD PDF — requires subscription OR role-based download permission
// ═══════════════════════════════════════════
router.get('/:id/download', async (req, res) => {
  try {
    const Books = require('./schema');
    const book = await Books.findById(req.params.id).exec();
    if (!book) return res.status(404).json({ error: 'book not found' });

    // Get current user
    const User = makeUserModel(mongoose);
    const user = await User.findById(req.user.sub).exec();
    if (!user) return res.status(401).json({ error: 'user not found' });

    // Check access: must be subscribed OR have canDownload OR role has frontend.download
    let hasAccess = user.isSubscribed || user.canDownload;

    if (!hasAccess) {
      // Check role-based permission
      const Role = makeRoleModel(mongoose);
      const roleDoc = await Role.findOne({ name: user.role }).lean();
      if (roleDoc && roleDoc.permissions && roleDoc.permissions.frontend && roleDoc.permissions.frontend.download) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'subscription or download access required' });
    }

    // Resolve PDF file path
    const pdfFileName = book.pdfFile || '';
    if (!pdfFileName) {
      return res.status(404).json({ error: 'no PDF file associated with this book' });
    }

    const assetDir = path.join(__dirname, '..', 'asset');
    const filePath = path.join(assetDir, pdfFileName);

    // Security: prevent path traversal
    if (!filePath.startsWith(assetDir)) {
      return res.status(400).json({ error: 'invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfFileName)}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'download failed' });
  }
});

module.exports = router;
