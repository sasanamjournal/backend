const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'asset', 'uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer memory storage — we process with sharp before saving
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, or WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

/**
 * Save uploaded image to disk as optimized JPEG.
 * Returns the filename (relative to UPLOAD_DIR).
 */
async function saveImage(buffer, originalName) {
  const id = crypto.randomBytes(8).toString('hex');
  const base = path.basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  const filename = `${base}_${id}.jpg`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await sharp(buffer)
    .jpeg({ quality: 85 })
    .toFile(filePath);

  return filename;
}

/**
 * Delete an image file from uploads directory.
 */
function deleteImage(filename) {
  if (!filename) return;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR)) return; // path traversal guard
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Serve image with optional resize via ?w= query parameter.
 * Supported widths: 360, 640, 1080, or original.
 */
async function serveImage(req, res) {
  try {
    const filename = req.params.filename;
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ error: 'invalid filename' });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'image not found' });
    }

    const widthParam = parseInt(req.query.w, 10);
    const allowedWidths = [360, 640, 1080];
    const width = allowedWidths.includes(widthParam) ? widthParam : null;

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (width) {
      const resized = await sharp(filePath)
        .resize(width, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      res.send(resized);
    } else {
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Serve image error:', err);
    res.status(500).json({ error: 'failed to serve image' });
  }
}

module.exports = { upload, saveImage, deleteImage, serveImage, UPLOAD_DIR };
