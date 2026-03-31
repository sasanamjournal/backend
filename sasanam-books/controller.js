
const service = require('./service');

// Validation middleware
const validateCreateBook = (req, res, next) => {
  const { bookName, authorName, sectionId } = req.body || {};

  if (!bookName || typeof bookName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Book name is required and must be a string',
      code: 'INVALID_REQUEST'
    });
  }
  if (bookName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Book name cannot be empty',
      code: 'INVALID_REQUEST'
    });
  }
  if (bookName.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Book name cannot exceed 100 characters',
      code: 'INVALID_REQUEST'
    });
  }
  if (!authorName || typeof authorName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Author name is required and must be a string',
      code: 'INVALID_REQUEST'
    });
  }
  if (authorName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Author name cannot be empty',
      code: 'INVALID_REQUEST'
    });
  }
  if (authorName.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Author name cannot exceed 100 characters',
      code: 'INVALID_REQUEST'
    });
  }
  if (!sectionId || typeof sectionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Section ID is required and must be a string',
      code: 'INVALID_REQUEST'
    });
  }
  next();
};

const validateUpdateBook = (req, res, next) => {
  const { bookName, authorName, sectionId } = req.body || {};

  if (bookName !== undefined) {
    if (typeof bookName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Book name must be a string',
        code: 'INVALID_REQUEST'
      });
    }
    if (bookName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Book name cannot be empty',
        code: 'INVALID_REQUEST'
      });
    }
    if (bookName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Book name cannot exceed 100 characters',
        code: 'INVALID_REQUEST'
      });
    }
  }
  if (authorName !== undefined) {
    if (typeof authorName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Author name must be a string',
        code: 'INVALID_REQUEST'
      });
    }
    if (authorName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Author name cannot be empty',
        code: 'INVALID_REQUEST'
      });
    }
    if (authorName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Author name cannot exceed 100 characters',
        code: 'INVALID_REQUEST'
      });
    }
  }
  if (sectionId !== undefined && typeof sectionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Section ID must be a string',
      code: 'INVALID_REQUEST'
    });
  }
  next();
};

const createBook = async (req, res) => {
  try {
    const result = await service.createBook(req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }
    res.status(result.status).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Create book controller error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getBookById = async (req, res) => {
  try {
    const result = await service.getBookById(req.params.id);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }
    res.status(result.status).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Get book controller error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getAllBooks = async (req, res) => {
  try {
    let { limit, page } = req.query;
    limit = limit ? parseInt(limit, 10) : 300;
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(limit) || limit < 1 || isNaN(page) || page < 1) {
      return res.status(400).json({ success: false, error: 'Invalid limit or page parameters' });
    }
    const result = await service.getAllBooks(limit, page);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }
    res.status(result.status).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Get all books controller error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const updateBook = async (req, res) => {
  try {
    const result = await service.updateBook(req.params.id, req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }
    res.status(result.status).json({ success: true, data: result.data });
  } catch (err) {
    console.error('Update book controller error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const deleteBook = async (req, res) => {
  try {
    const result = await service.deleteBook(req.params.id);
    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error });
    }
    res.status(200).json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Delete book controller error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  validateCreateBook,
  validateUpdateBook,
  createBook,
  getBookById,
  getAllBooks,
  updateBook,
  deleteBook
};
