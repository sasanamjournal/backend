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
  }
}, { timestamps: true });

const Books = mongoose.model('Books', BooksSchema);

module.exports = Books;
