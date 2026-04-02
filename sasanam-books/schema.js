const mongoose = require('mongoose');

const BooksSchema = new mongoose.Schema({
  bookName: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  pdfFile: {
    type: String,
    default: '',
    trim: true
  },
  coverImage: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  }
}, { timestamps: true });

const Books = mongoose.model('Books', BooksSchema);

module.exports = Books;
