const mongoose = require('mongoose');

const SasanamBookDetailsSchema = new mongoose.Schema({
  bookid: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'SasanamBook',
  },
  bookDetails: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SasanamBookDetails', SasanamBookDetailsSchema);