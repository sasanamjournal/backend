const mongoose = require('mongoose');
const connect = require('../db');
const makeUserNewsModel = require('./schema');
const makeUserModel = require('../auth/schema');
const AppError = require('../utils/AppError');
const { sendNewsNotification } = require('../utils/emailService');

async function getAllNews(limit = 20, page = 1) {
  try {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new AppError('limit must be an integer between 1 and 100', 400);
    if (!Number.isInteger(page) || page < 1)
      throw new AppError('page must be a positive integer', 400);

    await connect();
    const UserNews = makeUserNewsModel(mongoose);
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      UserNews.find({ isPublished: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      UserNews.countDocuments({ isPublished: true }).exec()
    ]);

    return { data: { news: news.map(n => n.toObject()), total, limit, page }, status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('getAllNews error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function getNewsById(id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError('invalid news id', 400);

    await connect();
    const UserNews = makeUserNewsModel(mongoose);
    const item = await UserNews.findOne({ _id: id, isPublished: true }).exec();
    if (!item) throw new AppError('news not found', 404);

    return { data: item.toObject(), status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('getNewsById error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function createNews({ title, content, category, imageUrl, author }) {
  try {
    await connect();
    const UserNews = makeUserNewsModel(mongoose);
    const item = new UserNews({ title, content, category, imageUrl, author });
    await item.save();

    // Notify all users via email (fire-and-forget)
    const User = makeUserModel(mongoose);
    User.find({}, 'email').lean().exec().then(users => {
      sendNewsNotification({ users, title, content, category });
    }).catch(err => console.error('Failed to fetch users for news email:', err.message));

    return { data: item.toObject(), status: 201, error: null };
  } catch (err) {
    console.error('createNews error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function updateNews(id, updates) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError('invalid news id', 400);

    await connect();
    const UserNews = makeUserNewsModel(mongoose);
    const item = await UserNews.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).exec();
    if (!item) throw new AppError('news not found', 404);

    return { data: item.toObject(), status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('updateNews error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function deleteNews(id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new AppError('invalid news id', 400);

    await connect();
    const UserNews = makeUserNewsModel(mongoose);
    const item = await UserNews.findByIdAndDelete(id).exec();
    if (!item) throw new AppError('news not found', 404);

    return { data: null, status: 200, error: null };
  } catch (err) {
    if (err.isOperational) return { data: null, status: err.statusCode, error: err.message };
    console.error('deleteNews error:', err);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

module.exports = { getAllNews, getNewsById, createNews, updateNews, deleteNews };
