/**
 * userNews middleware
 *
 * validateNewsBody  — ensures required fields are present before reaching the controller
 * validateNewsQuery — coerces and validates pagination query params
 */

const validateNewsBody = (req, res, next) => {
  const { title, content } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'content is required' });
  }

  req.body.title   = title.trim();
  req.body.content = content.trim();
  return next();
};

const validateNewsQuery = (req, res, next) => {
  const limit = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 20;
  const page  = req.query.page  !== undefined ? parseInt(req.query.page,  10) : 1;

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ success: false, error: 'limit must be an integer between 1 and 100' });
  }
  if (!Number.isFinite(page) || page < 1) {
    return res.status(400).json({ success: false, error: 'page must be a positive integer' });
  }

  req.query.limit = limit;
  req.query.page  = page;
  return next();
};

module.exports = { validateNewsBody, validateNewsQuery };
