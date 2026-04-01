const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const makeUserModel = require('./schema');

const JWT_SECRET = process.env.JWT_SECRET;

const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing or invalid authorization header' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const User = makeUserModel(mongoose);
    const user = await User.findById(decoded.sub).exec();

    if (!user) {
      return res.status(401).json({ error: 'user not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'admin access required' });
    }

    req.user = decoded;
    req.adminUser = user;
    return next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token expired' });
    }
    return res.status(401).json({ error: 'invalid token' });
  }
};

module.exports = { requireAdmin };
