const { Schema } = require('mongoose');

const resourceCenterSchema = new Schema({
  name:        { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  location:    { type: String, trim: true, maxlength: 200, default: '' },
  url:         { type: String, trim: true, default: '' },
  imageUrl:    { type: String, trim: true, default: null },
  isPublished: { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

resourceCenterSchema.index({ isPublished: 1, order: 1 });

module.exports = function makeResourceCenterModel(mongoose) {
  try { return mongoose.model('ResourceCenter'); }
  catch (e) { return mongoose.model('ResourceCenter', resourceCenterSchema); }
};
