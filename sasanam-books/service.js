
const connect = require('../db');
const mongoose = require('mongoose');
const Books = require('./schema');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

async function createBook(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid request data', 400);
    }
    if (!data.bookName || typeof data.bookName !== 'string' || !data.bookName.trim()) {
      throw new AppError('Book name is required and must be a non-empty string', 400);
    }
    if (!data.authorName || typeof data.authorName !== 'string' || !data.authorName.trim()) {
      throw new AppError('Author name is required and must be a non-empty string', 400);
    }
    if (!data.sectionId || !mongoose.Types.ObjectId.isValid(data.sectionId)) {
      throw new AppError('Valid sectionId is required', 400);
    }

    await connect();

    // Check for duplicate book (by name and author in the same section)
    const existing = await Books.findOne({
      bookName: data.bookName.trim(),
      authorName: data.authorName.trim(),
      sectionId: data.sectionId
    }).exec();
    if (existing) {
      throw new AppError('Book with this name and author already exists in this section', 409);
    }

    const book = new Books({
      bookName: data.bookName.trim(),
      authorName: data.authorName.trim(),
      sectionId: data.sectionId
    });
    const saved = await book.save();
    return {
      data: saved.toObject(),
      status: 201,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return {
        data: null,
        status: error.statusCode,
        error: error.message
      };
    }
    if (error.code === 11000) {
      return {
        data: null,
        status: 409,
        error: 'Book must be unique in section'
      };
    }
    console.error('Create book error:', error);
    return {
      data: null,
      status: 500,
      error: 'Internal server error'
    };
  }
}

async function getBookById(id) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid book ID format', 400);
    }
    await connect();
    const books = await Books.find({ sectionId: id }).exec();
    console.log("books", books);
    if (!books || books.length === 0) {
      throw new AppError('Book not found', 404);
    }
    return {
      data: books.map(b => b.toObject()),
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return {
        data: null,
        status: error.statusCode,
        error: error.message
      };
    }
    console.error('Get book error:', error);
    return {
      data: null,
      status: 500,
      error: 'Internal server error'
    };
  }
}

async function getAllBooks(limit = 300, page = 1) {
  try {
    if (limit < 1 || !Number.isInteger(limit) || page < 1 || !Number.isInteger(page)) {
      throw new AppError('Invalid limit or page parameters', 400);
    }
    if (limit > 1000) {
      throw new AppError('Limit cannot exceed 1000', 400);
    }
    await connect();
    const skip = (page - 1) * limit;
    const books = await Books.find()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .exec();
    const total = await Books.countDocuments();
    return {
      data: {
        books: books.map(b => b.toObject()),
        total,
        limit,
        page
      },
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return {
        data: null,
        status: error.statusCode,
        error: error.message
      };
    }
    console.error('Get all books error:', error);
    return {
      data: null,
      status: 500,
      error: 'Internal server error'
    };
  }
}

async function updateBook(id, data) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid book ID format', 400);
    }
    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid request data', 400);
    }
    if (data.bookName !== undefined) {
      if (typeof data.bookName !== 'string' || !data.bookName.trim()) {
        throw new AppError('Book name must be a non-empty string', 400);
      }
    }
    if (data.authorName !== undefined) {
      if (typeof data.authorName !== 'string' || !data.authorName.trim()) {
        throw new AppError('Author name must be a non-empty string', 400);
      }
    }
    if (data.sectionId !== undefined && !mongoose.Types.ObjectId.isValid(data.sectionId)) {
      throw new AppError('sectionId must be a valid ObjectId', 400);
    }

    await connect();
    const existing = await Books.findById(id).exec();
    if (!existing) {
      throw new AppError('Book not found', 404);
    }

    // Check for duplicate if bookName, authorName, or sectionId is being changed
    let checkName = data.bookName !== undefined ? data.bookName.trim() : existing.bookName;
    let checkAuthor = data.authorName !== undefined ? data.authorName.trim() : existing.authorName;
    let checkSection = data.sectionId !== undefined ? data.sectionId : existing.sectionId;
    if (
      checkName !== existing.bookName ||
      checkAuthor !== existing.authorName ||
      checkSection.toString() !== existing.sectionId.toString()
    ) {
      const duplicate = await Books.findOne({
        bookName: checkName,
        authorName: checkAuthor,
        sectionId: checkSection
      }).exec();
      if (duplicate && duplicate._id.toString() !== id) {
        throw new AppError('Book with this name and author already exists in this section', 409);
      }
    }

    const updated = await Books.findByIdAndUpdate(
      id,
      {
        ...(data.bookName !== undefined && { bookName: data.bookName.trim() }),
        ...(data.authorName !== undefined && { authorName: data.authorName.trim() }),
        ...(data.sectionId !== undefined && { sectionId: data.sectionId })
      },
      { new: true, runValidators: true }
    ).exec();

    return {
      data: updated.toObject(),
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return {
        data: null,
        status: error.statusCode,
        error: error.message
      };
    }
    if (error.code === 11000) {
      return {
        data: null,
        status: 409,
        error: 'Book must be unique in section'
      };
    }
    console.error('Update book error:', error);
    return {
      data: null,
      status: 500,
      error: 'Internal server error'
    };
  }
}

async function deleteBook(id) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid book ID format', 400);
    }
    await connect();
    const book = await Books.findByIdAndDelete(id).exec();
    if (!book) {
      throw new AppError('Book not found', 404);
    }
    return {
      data: book.toObject(),
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return {
        data: null,
        status: error.statusCode,
        error: error.message
      };
    }
    console.error('Delete book error:', error);
    return {
      data: null,
      status: 500,
      error: 'Internal server error'
    };
  }
}

module.exports = {
  createBook,
  getBookById,
  getAllBooks,
  updateBook,
  deleteBook
};
