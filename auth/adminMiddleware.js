const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const makeUserModel = require('./schema');
const makeRoleModel = require('./roleSchema');

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory cache for role permissions (refreshed every 2 minutes)
let roleCache = null;
let roleCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetch all roles from DB (with cache).
 */
const getRolesFromDB = async () => {
  const now = Date.now();
  if (roleCache && (now - roleCacheTime) < CACHE_TTL) {
    return roleCache;
  }

  const Role = makeRoleModel(mongoose);
  const roles = await Role.find().lean();
  const map = {};
  for (const role of roles) {
    map[role.name] = role;
  }
  roleCache = map;
  roleCacheTime = now;
  return map;
};

/**
 * Force refresh the role cache (call after role update).
 */
const invalidateRoleCache = () => {
  roleCache = null;
  roleCacheTime = 0;
};

/**
 * Check if a role has a specific permission.
 * Permission format: "section.action" e.g. "news.delete"
 */
const checkPermission = (roleDoc, permission) => {
  if (!roleDoc || !roleDoc.permissions) return false;
  const [section, action] = permission.split('.');
  if (!section || !action) return false;
  const sectionPerms = roleDoc.permissions[section];
  if (!sectionPerms) return false;
  return sectionPerms[action] === true;
};

/**
 * Flatten role permissions into a string array for frontend.
 */
const flattenPermissions = (roleDoc) => {
  if (!roleDoc || !roleDoc.permissions) return [];
  const perms = [];
  const permissions = roleDoc.permissions;
  for (const section of Object.keys(permissions)) {
    const sectionPerms = permissions[section];
    if (sectionPerms && typeof sectionPerms === 'object') {
      for (const action of Object.keys(sectionPerms)) {
        if (sectionPerms[action] === true) {
          perms.push(`${section}.${action}`);
        }
      }
    }
  }
  return perms;
};

/**
 * Middleware: Authenticate and verify the user has admin panel access.
 * Sets req.user, req.adminUser, req.roleDoc, req.permissions.
 * Allows: mentor, admin, super_admin (any role with dashboard.view permission)
 */
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

    // Fetch role from DB
    const roles = await getRolesFromDB();
    const roleDoc = roles[user.role];

    if (!roleDoc || !checkPermission(roleDoc, 'dashboard.view')) {
      return res.status(403).json({ error: 'admin panel access required' });
    }

    req.user = decoded;
    req.adminUser = user;
    req.roleDoc = roleDoc;
    req.permissions = flattenPermissions(roleDoc);
    return next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token expired' });
    }
    return res.status(401).json({ error: 'invalid token' });
  }
};

/**
 * Middleware factory: Check if the current user has a specific permission.
 * Must be used AFTER requireAdmin.
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.roleDoc) {
      return res.status(401).json({ error: 'not authenticated' });
    }

    if (!checkPermission(req.roleDoc, permission)) {
      return res.status(403).json({
        error: `permission denied: ${permission}`,
        requiredPermission: permission,
        yourRole: req.adminUser.role,
      });
    }

    return next();
  };
};

module.exports = {
  requireAdmin,
  requirePermission,
  getRolesFromDB,
  invalidateRoleCache,
  flattenPermissions,
  checkPermission,
};
