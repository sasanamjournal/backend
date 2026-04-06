// Controller for sasanma-bulkbooks
const service = require('./service');
const AppError = require('../utils/AppError');
const { uploadPdf, uploadImage: uploadCoverImage, deleteFromR2 } = require('../utils/r2');

const validateBulkBook = (body) => {
  const requiredFields = ['bookName', 'authorName', 'sectionId', 'pdfFile'];
  for (const field of requiredFields) {
    if (!body[field]) {
      throw new AppError(`${field} is required`, 400);
    }
  }
};

// Import upload functions (adjust path if needed)

// The middleware and handler need to be separate, then combined in the route
// const uploadFields = upload.fields([
//   { name: 'pdfFile', maxCount: 1 },
//   { name: 'coverImage', maxCount: 1 },
// ]);


// ✅ correct imports

const createBulkBook = async (req, res) => {
  console.log('Create bulk book request body:', req.body);
  try {
    const { bookName, authorName, sectionId, description, order } = req.body;
    if (!bookName || !authorName || !sectionId) {
      return res.status(400).json({ error: 'bookName, authorName, and sectionId are required' });
    }

    const bookData = {
      bookName: bookName.trim(),
      authorName: authorName.trim(),
      sectionId,
      description: (description || '').trim(),
      order,
    };

    if (req.files?.pdfFile?.[0]) {
      bookData.pdfFile = await uploadPdf(req.files.pdfFile[0].buffer, req.files.pdfFile[0].originalname);
    }
    if (req.files?.coverImage?.[0]) {
      bookData.coverImage = await uploadCoverImage(req.files.coverImage[0].buffer, req.files.coverImage[0].originalname);
    }

    const book = await service.createBulkBook(bookData);
    const populated = await service.getBulkBookById(book._id);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('Create bulk book error:', err);
    if (err.code === 11000) return res.status(409).json({ error: 'Duplicate book' });
    res.status(500).json({ error: 'internal server error' });
  }
};

// ... rest of your controllers unchanged

// module.exports = { createBulkBook, uploadFields };

const getBulkBooks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await service.getBulkBooks({}, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getBulkBookById = async (req, res, next) => {
  try {
    const book = await service.getBulkBookById(req.params.id);
    res.json(book);
  } catch (err) {
    next(err);
  }
};

const updateBulkBook = async (req, res, next) => {
  try {
    console.log('Update bulk book request body:', req.body);
    const book = await service.updateBulkBook(req.params.id, req.body);
    res.json(book);
  } catch (err) {
    next(err);
  }
};

const deleteBulkBook = async (req, res, next) => {
  try {
    await service.deleteBulkBook(req.params.id);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    next(err);
  }
};


const viewBulkBookPdf = async (req, res, next) => {
  try {
    console.log('View bulk book PDF request for ID:', req.params.id);
    const range = req.headers.range || null;
    await service.viewBulkBookPdf(req.params.id, res, range);
  } catch (err) {
    next(err);
  }
};

const downloadBulkBookPdf = async (req, res, next) => {
  try {
    await service.downloadBulkBookPdf(req, res);
  } catch (err) {
    next(err);
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
