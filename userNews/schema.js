const { Schema } = require('mongoose');

const userNewsSchema = new Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  content:     { type: String, required: true, trim: true },
  category:    { type: String, trim: true, maxlength: 50, default: 'general' },
  imageUrl:    { type: String, trim: true, default: null },
  isPublished: { type: Boolean, default: true },
  author:      { type: String, trim: true, maxlength: 100, default: 'admin' }
}, { timestamps: true });

module.exports = function makeUserNewsModel(mongoose) {
  try { return mongoose.model('UserNews'); }
  catch (e) { return mongoose.model('UserNews', userNewsSchema); }
};
