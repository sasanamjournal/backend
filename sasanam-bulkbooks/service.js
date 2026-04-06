
// Service for sasanma-bulkbooks
const mongoose = require('mongoose');
const SasanmaBulkBook = require('./schema');
const AppError = require('../utils/AppError');
const { getStreamFromR2 } = require('../utils/r2');
const makeUserModel = require('../auth/schema');
const makeRoleModel = require('../auth/roleSchema');
const createBulkBook = async (data) => {
  return await SasanmaBulkBook.create(data);
};

const getBulkBooks = async (filter = {}, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [books, total] = await Promise.all([
    SasanmaBulkBook.find(filter).skip(skip).limit(limit),
    SasanmaBulkBook.countDocuments(filter)
  ]);
  if (!books || books.length === 0) {
    throw new AppError('No data found', 404);
  }
  return {
    data: books,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit)
  };
};

const getBulkBookById = async (id) => {
  const book = await SasanmaBulkBook.findById(id);
  if (!book) {
    throw new AppError('No data found', 404);
  }
  return book;
};

const updateBulkBook = async (id, data) => {
  try {
    console.log('Updating book with ID:', id, 'Data:', data);
    const existing = await SasanmaBulkBook.findById(id);
    if (!existing) {
      throw new AppError('book not found', 404);
    }
    const { bookName, authorName, sectionId, description } = data;
    const update = {};
    if (bookName !== undefined) update.bookName = bookName.trim();
    if (authorName !== undefined) update.authorName = authorName.trim();
    if (sectionId !== undefined) update.sectionId = sectionId;
    if (description !== undefined) update.description = description.trim();

    if (data.files && data.files.pdfFile && data.files.pdfFile[0]) {
      if (existing.pdfFile) await deleteFromR2(existing.pdfFile);
      update.pdfFile = await uploadPdf(data.files.pdfFile[0].buffer, data.files.pdfFile[0].originalname);
    }
    if (data.files && data.files.coverImage && data.files.coverImage[0]) {
      if (existing.coverImage) await deleteFromR2(existing.coverImage);
      update.coverImage = await uploadCoverImage(data.files.coverImage[0].buffer, data.files.coverImage[0].originalname);
    }

    const book = await SasanmaBulkBook.findByIdAndUpdate(id, update, { new: true }).populate('sectionId', 'name').lean();
    return book;
  } catch (err) {
    console.error('Update book error:', err);
    throw new AppError('internal server error', err, 500);
  }
};

const deleteBulkBook = async (id) => {
  const book = await SasanmaBulkBook.findById(id);
   if (!book) {
    throw new AppError('book not found', 404);
  }
   if (book.pdfFile) await deleteFromR2(book.pdfFile);
    if (book.coverImage) await deleteFromR2(book.coverImage);
  await SasanmaBulkBook.findByIdAndDelete(id);
  return book;
};

const viewBulkBookPdf = async (id, res, range) => {
  try {
    const book = await SasanmaBulkBook.findById(id).exec();
    if (!book) return res.status(404).json({ error: 'book not found' });

    const pdfKey = book.pdfFile || '';
    if (!pdfKey) return res.status(404).json({ error: 'no PDF file' });
    console.log(`Viewing PDF for book ${book._id}, key: ${pdfKey}, range: ${range || 'none'}`);
    const result = await getStreamFromR2(pdfKey, range);
    if (!result) return res.status(404).json({ error: 'file not found in storage' });

    if (range && result.contentRange) {
      res.writeHead(206, {
        'Content-Range': result.contentRange,
        'Accept-Ranges': 'bytes',
        'Content-Length': result.contentLength,
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, max-age=3600',
      });
    } else {
      res.writeHead(200, {
        'Content-Length': result.contentLength,
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      });
    }

    result.stream.pipe(res);
  } catch (err) {
    console.error('View PDF error:', err);
    res.status(500).json({ error: 'failed to load PDF' });
  }
};

const downloadBulkBookPdf = async (req, res) => {
  try {
      const book = await SasanmaBulkBook.findById(req.params.id).exec();
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
  
      // Resolve PDF key
      const pdfKey = book.pdfFile || '';
      if (!pdfKey) {
        return res.status(404).json({ error: 'no PDF file associated with this book' });
      }
  
      const result = await getStreamFromR2(pdfKey);
      if (!result) {
        return res.status(404).json({ error: 'PDF file not found in storage' });
      }
  
      // Increment download count for non-unlimited users
      if (!unlimitedAccess) {
        await User.findByIdAndUpdate(user._id, { $inc: { downloadCount: 1 } });
      }
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfKey.split('/').pop() || 'book.pdf')}"`);
      result.stream.pipe(res);
    } catch (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'download failed' });
    }
};

module.exports = {
  createBulkBook,
  getBulkBooks,
  getBulkBookById,
  updateBulkBook,
  deleteBulkBook,
  viewBulkBookPdf,
  downloadBulkBookPdf,
  };
