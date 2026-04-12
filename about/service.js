const mongoose = require('mongoose');
const connect = require('../db');
const { makeTeamMemberModel, makeAuthorModel } = require('./schema');
const AppError = require('../utils/AppError');

async function getTeamMembers(deviceType, networkSpeed) {
  try {
    await connect();
    const TeamMember = makeTeamMemberModel(mongoose);
    const members = await TeamMember.find().sort({ order: 1, createdAt: 1 }).exec();

    let resolution = 1080;
    if (deviceType === 'mobile') {
      resolution = 1080;
    } else {
      const speedStr = networkSpeed || '';
      if (speedStr.includes('Mbps')) {
        const speed = parseFloat(speedStr);
        if (!isNaN(speed)) {
          if (speed > 5) resolution = 1080;
          else if (speed >= 2) resolution = 640;
          else resolution = 360;
        }
      } else {
        switch (speedStr.toLowerCase()) {
          case '4g': resolution = 1080; break;
          case '3g': resolution = 640; break;
          case '2g':
          case 'slow-2g': resolution = 360; break;
          default: resolution = 1080; break;
        }
      }
    }

    const processedMembers = members.map((m) => {
      const memberObj = m.toObject ? m.toObject() : m;
      if (memberObj.photo) {
        try {
          const urlObj = new URL(memberObj.photo);
          urlObj.searchParams.set('w', resolution.toString());
          memberObj.photo = urlObj.toString();
        } catch (e) {
          if (memberObj.photo.includes('?')) {
            if (!memberObj.photo.includes('w=')) {
              memberObj.photo = `${memberObj.photo}&w=${resolution}`;
            }
          } else {
            memberObj.photo = `${memberObj.photo}?w=${resolution}`;
          }
        }
      }
      return memberObj;
    });

    return {
      data: processedMembers,
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

async function getAuthors(limit = 20, page = 1, deviceType, networkSpeed) {
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

    let resolution = 1080;
    if (deviceType === 'mobile') {
      resolution = 1080;
    } else {
      const speedStr = networkSpeed || '';
      if (speedStr.includes('Mbps')) {
        const speed = parseFloat(speedStr);
        if (!isNaN(speed)) {
          if (speed > 5) resolution = 1080;
          else if (speed >= 2) resolution = 640;
          else resolution = 360;
        }
      } else {
        switch (speedStr.toLowerCase()) {
          case '4g': resolution = 1080; break;
          case '3g': resolution = 640; break;
          case '2g':
          case 'slow-2g': resolution = 360; break;
          default: resolution = 1080; break;
        }
      }
    }

    const processedAuthors = authors.map((a) => {
      const authorObj = a.toObject ? a.toObject() : a;
      if (authorObj.photo) {
        try {
          const urlObj = new URL(authorObj.photo);
          urlObj.searchParams.set('w', resolution.toString());
          authorObj.photo = urlObj.toString();
        } catch (e) {
          if (authorObj.photo.includes('?')) {
            if (!authorObj.photo.includes('w=')) {
              authorObj.photo = `${authorObj.photo}&w=${resolution}`;
            }
          } else {
            authorObj.photo = `${authorObj.photo}?w=${resolution}`;
          }
        }
      }
      return authorObj;
    });

    return {
      data: { authors: processedAuthors, total, limit, page },
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
