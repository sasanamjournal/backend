const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'sasanam';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // e.g. https://cdn.sasanam.in

/**
 * Upload a buffer to R2. Returns the key (filename).
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} folder - 'uploads' | 'pdfs'
 * @param {string} contentType
 */
async function uploadToR2(buffer, originalName, folder = 'uploads', contentType = 'image/jpeg') {
  const id = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName) || '.jpg';
  const base = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  const key = `${folder}/${base}_${id}${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return key;
}

/**
 * Upload an image — optimizes with sharp first, returns key.
 */
async function uploadImage(buffer, originalName) {
  const optimized = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
  const id = crypto.randomBytes(8).toString('hex');
  const base = path.basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  const key = `uploads/${base}_${id}.jpg`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
  }));

  return key;
}

/**
 * Upload a PDF — stores as-is, returns key.
 */
async function uploadPdf(buffer, originalName) {
  return uploadToR2(buffer, originalName, 'pdfs', 'application/pdf');
}

/**
 * Delete a file from R2 by key.
 */
async function deleteFromR2(key) {
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
  } catch (err) {
    console.error('R2 delete error:', err.message);
  }
}

/**
 * Get a readable stream from R2 for a given key.
 * Returns { stream, contentType, contentLength } or null.
 */
async function getStreamFromR2(key, range) {
  try {
    const params = { Bucket: BUCKET, Key: key };
    if (range) params.Range = range;

    const response = await r2.send(new GetObjectCommand(params));
    return {
      stream: response.Body,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
      contentRange: response.ContentRange,
    };
  } catch (err) {
    console.error('R2 get error:', err.message);
    return null;
  }
}

/**
 * Get the public URL for a key.
 */
function getPublicUrl(key) {
  if (!key) return '';
  if (PUBLIC_URL) return `${PUBLIC_URL}/${key}`;
  return `/r2/${key}`; // fallback proxy
}

module.exports = {
  uploadImage,
  uploadPdf,
  uploadToR2,
  deleteFromR2,
  getStreamFromR2,
  getPublicUrl,
  BUCKET,
  r2,
};
