/**
 * Seed default roles into the database.
 * Usage: node auth/seed-roles.js
 * Safe to run multiple times — upserts by name.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('../db');
const makeRoleModel = require('./roleSchema');

const DEFAULT_ROLES = [
  {
    name: 'user',
    label: 'User',
    description: 'Regular frontend user with no admin access',
    permissions: {
      dashboard: { view: false },
      users: { view: false, create: false, update: false, delete: false, create_mentor: false, create_admin: false, create_super_admin: false },
      payments: { view: false, refund: false },
      donations: { view: false, delete: false },
      news: { view: false, create: false, update: false, delete: false },
      team: { view: false, create: false, update: false, delete: false },
      authors: { view: false, create: false, update: false, delete: false },
      frontend: { download: false },
    },
  },
  {
    name: 'mentor',
    label: 'Mentor',
    description: 'View-only admin panel access, can download PDFs in frontend',
    permissions: {
      dashboard: { view: true },
      users: { view: true, create: false, update: false, delete: false, create_mentor: false, create_admin: false, create_super_admin: false },
      payments: { view: true, refund: false },
      donations: { view: true, delete: false },
      news: { view: true, create: false, update: false, delete: false },
      team: { view: true, create: false, update: false, delete: false },
      authors: { view: true, create: false, update: false, delete: false },
      frontend: { download: true },
    },
  },
  {
    name: 'admin',
    label: 'Admin',
    description: 'Full admin panel access, can create mentors but not admins',
    permissions: {
      dashboard: { view: true },
      users: { view: true, create: false, update: true, delete: true, create_mentor: true, create_admin: false, create_super_admin: false },
      payments: { view: true, refund: true },
      donations: { view: true, delete: true },
      news: { view: true, create: true, update: true, delete: true },
      team: { view: true, create: true, update: true, delete: true },
      authors: { view: true, create: true, update: true, delete: true },
      frontend: { download: false },
    },
  },
  {
    name: 'super_admin',
    label: 'Super Admin',
    description: 'Full access to everything including creating admins',
    permissions: {
      dashboard: { view: true },
      users: { view: true, create: true, update: true, delete: true, create_mentor: true, create_admin: true, create_super_admin: true },
      payments: { view: true, refund: true },
      donations: { view: true, delete: true },
      news: { view: true, create: true, update: true, delete: true },
      team: { view: true, create: true, update: true, delete: true },
      authors: { view: true, create: true, update: true, delete: true },
      frontend: { download: true },
    },
  },
];

async function seedRoles() {
  try {
    await connect();
    const Role = makeRoleModel(mongoose);

    for (const roleData of DEFAULT_ROLES) {
      await Role.findOneAndUpdate(
        { name: roleData.name },
        roleData,
        { upsert: true, new: true }
      );
      console.log(`Role "${roleData.name}" seeded.`);
    }

    console.log('All roles seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding roles:', err.message);
    process.exit(1);
  }
}

seedRoles();
