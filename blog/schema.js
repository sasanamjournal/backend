const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Sasanam Team',
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'general',
    },
    tags: {
      type: [String],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 70,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
  },
  { timestamps: true }
);

blogSchema.index({ slug: 1 });
blogSchema.index({ isPublished: 1, createdAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });

module.exports = mongoose.model('Blog', blogSchema);
