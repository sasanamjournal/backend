const mongoose = require('mongoose');
const { Schema } = mongoose;

const SasanmaBulkBookSchema = new Schema({
  bookName: { type: String, required: true },
  authorName: { type: String, required: true },
  sectionId: { type: Schema.Types.ObjectId, ref: 'SasanamSection', required: true },
  pdfFile: { type: String, required: true },
  coverImage: { type: String, default: '' },
  description: { type: String, default: '' },
  order: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SasanmaBulkBook', SasanmaBulkBookSchema);
