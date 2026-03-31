const mongoose = require('mongoose');
const connect = require('../db');
const { makeTeamMemberModel, makeAuthorModel } = require('./schema');
const AppError = require('../utils/AppError');

async function getTeamMembers() {
  try {
    await connect();
    const TeamMember = makeTeamMemberModel(mongoose);
    const members = await TeamMember.find().sort({ order: 1, createdAt: 1 }).exec();
    return {
      data: members.map((m) => m.toObject()),
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }
    console.error('Get team members error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function addTeamMember(payload) {
  try {
    if (!payload || !payload.name || !payload.role) {
      throw new AppError('name and role are required', 400);
    }
    await connect();
    const TeamMember = makeTeamMemberModel(mongoose);
    const member = await TeamMember.create({
      name: payload.name,
      role: payload.role,
      photo: payload.photo || '',
      bio: payload.bio || '',
      order: payload.order || 0
    });
    return { data: member.toObject(), status: 201, error: null };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }
    console.error('Add team member error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function getAuthors(limit = 20, page = 1) {
  try {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError('limit must be an integer between 1 and 100', 400);
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new AppError('page must be a positive integer', 400);
    }
    await connect();
    const Author = makeAuthorModel(mongoose);
    const skip = (page - 1) * limit;
    const authors = await Author.find().sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit).exec();
    const total = await Author.countDocuments().exec();
    return {
      data: { authors: authors.map((a) => a.toObject()), total, limit, page },
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }
    console.error('Get authors error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

async function addAuthor(payload) {
  try {
    if (!payload || !payload.name || !payload.bookName) {
      throw new AppError('name and bookName are required', 400);
    }
    await connect();
    const Author = makeAuthorModel(mongoose);
    const author = await Author.create({
      name: payload.name,
      photo: payload.photo || '',
      bookName: payload.bookName,
      order: payload.order || 0
    });
    return { data: author.toObject(), status: 201, error: null };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }
    console.error('Add author error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
}

module.exports = { getTeamMembers, addTeamMember, getAuthors, addAuthor };
