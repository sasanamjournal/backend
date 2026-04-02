const { Schema } = require('mongoose');

const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['user', 'mentor', 'admin', 'super_admin'],
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  permissions: {
    dashboard: { view: { type: Boolean, default: false } },
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      create_mentor: { type: Boolean, default: false },
      create_admin: { type: Boolean, default: false },
      create_super_admin: { type: Boolean, default: false },
    },
    payments: {
      view: { type: Boolean, default: false },
      refund: { type: Boolean, default: false },
    },
    donations: {
      view: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    news: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    team: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    authors: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    frontend: {
      download: { type: Boolean, default: false },
    },
  },
}, { timestamps: true });

module.exports = function makeRoleModel(mongoose) {
  try {
    return mongoose.model('Role');
  } catch (e) {
    return mongoose.model('Role', roleSchema);
  }
};
