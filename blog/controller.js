const service = require('./service');

const getAll = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const page = parseInt(req.query.page, 10) || 1;
  const category = req.query.category || undefined;
  const result = await service.getAllPosts(limit, page, category);
  res.status(result.status).json(result.error ? { success: false, error: result.error } : { success: true, data: result.data });
};

const getBySlug = async (req, res) => {
  const result = await service.getPostBySlug(req.params.slug);
  res.status(result.status).json(result.error ? { success: false, error: result.error } : { success: true, data: result.data });
};

const create = async (req, res) => {
  const result = await service.createPost(req.body);
  res.status(result.status).json(result.error ? { success: false, error: result.error } : { success: true, data: result.data });
};

const update = async (req, res) => {
  const result = await service.updatePost(req.params.id, req.body);
  res.status(result.status).json(result.error ? { success: false, error: result.error } : { success: true, data: result.data });
};

const remove = async (req, res) => {
  const result = await service.deletePost(req.params.id);
  res.status(result.status).json(result.error ? { success: false, error: result.error } : { success: true });
};

module.exports = { getAll, getBySlug, create, update, remove };
