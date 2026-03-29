
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
  if (bookName.length > 300) {
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
  if (authorName.length > 200) {
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
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getBookById = async (req, res) => {
  try {
    const result = await service.getBookById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const result = await service.getAllBooks();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateBook = async (req, res) => {
  try {
    const result = await service.updateBook(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteBook = async (req, res) => {
  try {
    const result = await service.deleteBook(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
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
