const {
  getAllNews: getAllNewsService,
  getNewsById: getNewsByIdService,
  createNews: createNewsService,
  updateNews: updateNewsService,
  deleteNews: deleteNewsService
} = require('./service');

const getAllNews = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const page  = req.query.page  ? parseInt(req.query.page,  10) : 1;

    const result = await getAllNewsService(limit, page);
    if (result.error) {
      return res.status(result.status ?? 400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    console.error('getAllNews controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getNewsByIdService(id);
    if (result.error) {
      return res.status(result.status ?? 400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    console.error('getNewsById controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const createNews = async (req, res) => {
  const { title, content, category, imageUrl, author } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'content is required' });
  }

  try {
    const result = await createNewsService({ title: title.trim(), content: content.trim(), category, imageUrl, author });
    if (result.error) {
      return res.status(result.status ?? 400).json({ success: false, error: result.error });
    }
    return res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error('createNews controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const updateNews = async (req, res) => {
  const { id } = req.params;
  const { title, content, category, imageUrl, isPublished, author } = req.body || {};

  const updates = {};
  if (title     !== undefined) updates.title       = title;
  if (content   !== undefined) updates.content     = content;
  if (category  !== undefined) updates.category    = category;
  if (imageUrl  !== undefined) updates.imageUrl    = imageUrl;
  if (isPublished !== undefined) updates.isPublished = isPublished;
  if (author    !== undefined) updates.author      = author;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'no fields to update' });
  }

  try {
    const result = await updateNewsService(id, updates);
    if (result.error) {
      return res.status(result.status ?? 400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    console.error('updateNews controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteNewsService(id);
    if (result.error) {
      return res.status(result.status ?? 400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, message: 'news deleted successfully' });
  } catch (err) {
    console.error('deleteNews controller error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = { getAllNews, getNewsById, createNews, updateNews, deleteNews };
