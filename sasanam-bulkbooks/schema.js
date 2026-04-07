const mongoose = require('mongoose');
const { Schema } = mongoose;

const SasanmaBulkBookSchema = new Schema({
  bookName: { type: String, required: true },
  authorName: { type: String, required: true },
  sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true
    },
  pdfFile: { type: String, default: '',
    trim: true },
  coverImage: { type: String, default: '' },
  description: { type: String, default: '' },
  order: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SasanmaBulkBook', SasanmaBulkBookSchema);
