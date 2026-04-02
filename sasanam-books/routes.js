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
// VIEW PDF — serves PDF inline for browser viewing (no download count)
// ═══════════════════════════════════════════
router.get('/:id/view', async (req, res) => {
  try {
    const Books = require('./schema');
    const book = await Books.findById(req.params.id).exec();
    if (!book) return res.status(404).json({ error: 'book not found' });

    const pdfFileName = book.pdfFile || '';
    if (!pdfFileName) return res.status(404).json({ error: 'no PDF file' });

    const assetDir = path.join(__dirname, '..', 'asset');
    const filePath = path.join(assetDir, pdfFileName);

    if (!filePath.startsWith(assetDir)) return res.status(400).json({ error: 'invalid path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdfFileName)}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('View PDF error:', err);
    res.status(500).json({ error: 'failed to load PDF' });
  }
});

// ═══════════════════════════════════════════
// FREE DOWNLOAD LIMIT
// ═══════════════════════════════════════════
const FREE_DOWNLOAD_LIMIT = 4;

// ═══════════════════════════════════════════
// GET DOWNLOAD STATUS — returns user's download info
// ═══════════════════════════════════════════
router.get('/download-status/me', async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const user = await User.findById(req.user.sub).select('isSubscribed canDownload downloadCount role').exec();
    if (!user) return res.status(401).json({ error: 'user not found' });

    let unlimitedAccess = user.isSubscribed || user.canDownload;
    if (!unlimitedAccess) {
      const Role = makeRoleModel(mongoose);
      const roleDoc = await Role.findOne({ name: user.role }).lean();
      if (roleDoc?.permissions?.frontend?.download) unlimitedAccess = true;
    }

    res.json({
      success: true,
      data: {
        isSubscribed: user.isSubscribed,
        canDownload: user.canDownload,
        unlimitedAccess,
        downloadCount: user.downloadCount || 0,
        freeLimit: FREE_DOWNLOAD_LIMIT,
        remaining: unlimitedAccess ? -1 : Math.max(0, FREE_DOWNLOAD_LIMIT - (user.downloadCount || 0)),
      }
    });
  } catch (err) {
    console.error('Download status error:', err);
    res.status(500).json({ error: 'failed to get download status' });
  }
});

// ═══════════════════════════════════════════
// DOWNLOAD PDF — 4 free downloads, then subscription required
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

    // Check if user has unlimited access (subscribed / canDownload / role permission)
    let unlimitedAccess = user.isSubscribed || user.canDownload;
    if (!unlimitedAccess) {
      const Role = makeRoleModel(mongoose);
      const roleDoc = await Role.findOne({ name: user.role }).lean();
      if (roleDoc?.permissions?.frontend?.download) unlimitedAccess = true;
    }

    // If no unlimited access, check free download limit
    if (!unlimitedAccess) {
      const currentCount = user.downloadCount || 0;
      if (currentCount >= FREE_DOWNLOAD_LIMIT) {
        return res.status(403).json({
          error: 'free_limit_reached',
          message: `You have used all ${FREE_DOWNLOAD_LIMIT} free downloads. Subscribe to download more.`,
          downloadCount: currentCount,
          freeLimit: FREE_DOWNLOAD_LIMIT,
        });
      }
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

    // Increment download count for non-unlimited users
    if (!unlimitedAccess) {
      await User.findByIdAndUpdate(user._id, { $inc: { downloadCount: 1 } });
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
