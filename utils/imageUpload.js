const multer = require('multer');
const sharp = require('sharp');
const { uploadImage, deleteFromR2, getStreamFromR2, getPublicUrl } = require('./r2');

// Multer memory storage — process with sharp then upload to R2
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
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Save uploaded image to R2 (optimized JPEG).
 * Returns the R2 key.
 */
async function saveImage(buffer, originalName) {
  return uploadImage(buffer, originalName);
}

/**
 * Delete an image from R2 by key.
 */
function deleteImage(key) {
  return deleteFromR2(key);
}

/**
 * Serve image with optional resize via ?w= query parameter.
 * Streams from R2, resizes on-the-fly if needed.
 */
async function serveImage(req, res) {
  try {
    const key = req.params[0] || req.params.key;
    if (!key || key.includes('..')) {
      return res.status(400).json({ error: 'invalid path' });
    }

    const widthParam = parseInt(req.query.w, 10);
    const allowedWidths = [360, 640, 1080];
    const width = allowedWidths.includes(widthParam) ? widthParam : null;

    const result = await getStreamFromR2(`uploads/${key}`);
    if (!result) return res.status(404).json({ error: 'image not found' });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (width) {
      // Collect stream, resize, send
      const chunks = [];
      for await (const chunk of result.stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const resized = await sharp(buffer)
        .resize(width, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      res.send(resized);
    } else {
      result.stream.pipe(res);
    }
  } catch (err) {
    console.error('Serve image error:', err);
    res.status(500).json({ error: 'failed to serve image' });
  }
}

module.exports = { upload, saveImage, deleteImage, serveImage, getPublicUrl };
