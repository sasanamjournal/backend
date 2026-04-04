const { Schema } = require('mongoose');

const archiveItemSchema = new Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  period:      { type: String, trim: true, maxlength: 100, default: '' },
  content:     { type: String, required: true, trim: true },
  images:      [{ type: String, trim: true }],
  isPublished: { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

archiveItemSchema.index({ isPublished: 1, order: 1 });

module.exports = function makeArchiveItemModel(mongoose) {
  try { return mongoose.model('ArchiveItem'); }
  catch (e) { return mongoose.model('ArchiveItem', archiveItemSchema); }
};
