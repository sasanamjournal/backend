// Service for sasanma-bulkbooks
const SasanmaBulkBook = require('./schema');
const AppError = require('../utils/AppError');

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
  const book = await SasanmaBulkBook.findByIdAndUpdate(id, data, { new: true });
  if (!book) {
    throw new AppError('No data found', 404);
  }
  return book;
};

const deleteBulkBook = async (id) => {
  const book = await SasanmaBulkBook.findByIdAndDelete(id);
  if (!book) {
    throw new AppError('No data found', 404);
  }
  return book;
};

module.exports = {
  createBulkBook,
  getBulkBooks,
  getBulkBookById,
  updateBulkBook,
  deleteBulkBook,
};
