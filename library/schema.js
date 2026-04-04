const { Schema } = require('mongoose');

const libraryLinkSchema = new Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  url:         { type: String, required: true, trim: true },
  category:    { type: String, trim: true, maxlength: 100, default: 'general' },
  imageUrl:    { type: String, trim: true, default: null },
  isPublished: { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

libraryLinkSchema.index({ isPublished: 1, order: 1 });

module.exports = function makeLibraryLinkModel(mongoose) {
  try { return mongoose.model('LibraryLink'); }
  catch (e) { return mongoose.model('LibraryLink', libraryLinkSchema); }
};
