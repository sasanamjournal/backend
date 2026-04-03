const mongoose = require('mongoose');
const connect = require('../db');
const Blog = require('./schema');
const AppError = require('../utils/AppError');

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

async function getAllPosts(limit = 20, page = 1, category) {
  try {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new AppError('limit must be 1-100', 400);
    if (!Number.isInteger(page) || page < 1)
      throw new AppError('page must be a positive integer', 400);

    await connect();
    const filter = { isPublished: true };
    if (category && category !== 'all') filter.category = category;

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      Blog.find(filter, '-content').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Blog.countDocuments(filter),
    ]);

    return { data: { posts, total, limit, page }, status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('getAllPosts error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function getPostBySlug(slug) {
  try {
    if (!slug || typeof slug !== 'string')
      throw new AppError('slug is required', 400);

    await connect();
    const post = await Blog.findOne({ slug: slug.trim(), isPublished: true }).lean();
    if (!post) throw new AppError('Blog post not found', 404);

    return { data: post, status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('getPostBySlug error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function createPost(data) {
  try {
    if (!data.title || !data.content || !data.excerpt)
      throw new AppError('title, excerpt, and content are required', 400);

    await connect();

    let slug = data.slug || generateSlug(data.title);
    const existing = await Blog.findOne({ slug }).lean();
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const post = await Blog.create({
      title: data.title.trim(),
      slug,
      excerpt: data.excerpt.trim(),
      content: data.content,
      coverImage: data.coverImage || '',
      author: data.author || 'Sasanam Team',
      category: data.category || 'general',
      tags: data.tags || [],
      isPublished: data.isPublished !== false,
      metaTitle: data.metaTitle || data.title.trim().substring(0, 70),
      metaDescription: data.metaDescription || data.excerpt.trim().substring(0, 160),
    });

    return { data: post.toObject(), status: 201, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    if (err.code === 11000) return { data: null, status: 409, error: 'Slug already exists' };
    console.error('createPost error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function updatePost(id, data) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError('Invalid post ID', 400);

    await connect();
    const post = await Blog.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!post) throw new AppError('Blog post not found', 404);

    return { data: post.toObject(), status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('updatePost error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function deletePost(id) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError('Invalid post ID', 400);

    await connect();
    const post = await Blog.findByIdAndDelete(id);
    if (!post) throw new AppError('Blog post not found', 404);

    return { data: null, status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('deletePost error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

module.exports = { getAllPosts, getPostBySlug, createPost, updatePost, deletePost };
