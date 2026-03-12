
const {
  createBook: createBookService,
  getBookById: getBookByIdService,
  getAllBooks: getAllBooksService,
  updateBook: updateBookService,
  deleteBook: deleteBookService
} = require('./service');

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

// Handler: Create Book
const createBook = async (req, res) => {
  try {
    const result = await createBookService(req.body);
    if (!result || result.error) {
      return res.status(result && result.status ? result.status : 400).json({
        success: false,
        error: result && result.error ? result.error : 'Failed to create book',
        code: result && result.status === 409 ? 'DUPLICATE_ENTRY' : 'VALIDATION_ERROR'
      });
    }
    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: result
    });
  } catch (err) {
    console.error('Create book controller error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Handler: Get Book by ID
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Book ID is required',
        code: 'INVALID_REQUEST'
      });
    }
    const result = await getBookByIdService(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Book not found',
        code: 'NOT_FOUND'
      });
    }
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get book controller error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Handler: Get All Books
const getAllBooks = async (req, res) => {
  try {
    let { limit, page } = req.query;
    limit = limit ? parseInt(limit, 10) : 300;
    page = page ? parseInt(page, 10) : 1;
    if (isNaN(limit) || limit < 1 || isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit or page parameters. Must be positive integers.',
        code: 'INVALID_REQUEST'
      });
    }
    const result = await getAllBooksService(limit, page);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get all books controller error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Handler: Update Book
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Book ID is required',
        code: 'INVALID_REQUEST'
      });
    }
    const result = await updateBookService(id, req.body);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Book not found',
        code: 'NOT_FOUND'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: result
    });
  } catch (err) {
    console.error('Update book controller error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Handler: Delete Book
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Book ID is required',
        code: 'INVALID_REQUEST'
      });
    }
    const result = await deleteBookService(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Book not found',
        code: 'NOT_FOUND'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Book deleted successfully',
      data: result
    });
  } catch (err) {
    console.error('Delete book controller error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
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
