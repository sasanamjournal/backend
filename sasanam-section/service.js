const connect = require('../db');
const mongoose = require('mongoose');
const makeSection = require('./schema');
const AppError = require('../utils/AppError');

async function createSection(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid request data', 400);
    }

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Section name is required and must be a non-empty string', 400);
    }

    await connect();
    const Section = makeSection(mongoose);

    // Check for duplicate name
    const existing = await Section.findOne({ name: data.name.trim() }).exec();
    if (existing) {
      throw new AppError('Section with this name already exists', 409);
    }

    const section = new Section({
      name: data.name.trim()
    });

    const saved = await section.save();
    return { 
      data: saved.toObject(), 
      status: 201, 
      error: null 
    };
  } catch (error) {
    if (error.isOperational) {
      return { 
        data: null, 
        status: error.statusCode, 
        error: error.message 
      };
    }
    if (error.code === 11000) {
      return { 
        data: null, 
        status: 409, 
        error: 'Section name must be unique' 
      };
    }
    console.error('Create section error:', error);
    return { 
      data: null, 
      status: 500, 
      error: 'Internal server error' 
    };
  }
}

async function getSectionById(id) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid section ID format', 400);
    }

    await connect();
    const Section = makeSection(mongoose);

    const section = await Section.findById(id).exec();
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    return { 
      data: section.toObject(), 
      status: 200, 
      error: null 
    };
  } catch (error) {
    if (error.isOperational) {
      return { 
        data: null, 
        status: error.statusCode, 
        error: error.message 
      };
    }
    console.error('Get section error:', error);
    return { 
      data: null, 
      status: 500, 
      error: 'Internal server error' 
    };
  }
}

async function getAllSections(limit = 100, page = 1) {
  try {
    if (limit < 1 || !Number.isInteger(limit) || page < 1 || !Number.isInteger(page)) {
      throw new AppError('Invalid limit or page parameters', 400);
    }
    if (limit > 1000) {
      throw new AppError('Limit cannot exceed 1000', 400);
    }
    await connect();
    const Section = makeSection(mongoose);
    const skip = (page - 1) * limit;
    const sections = await Section.find()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .exec();
    const total = await Section.countDocuments();
    return { 
      data: {
        sections: sections.map(s => s.toObject()),
        total,
        limit,
        page
      }, 
      status: 200, 
      error: null 
    };
  } catch (error) {
    if (error.isOperational) {
      return { 
        data: null, 
        status: error.statusCode, 
        error: error.message 
      };
    }
    console.error('Get all sections error:', error);
    return { 
      data: null, 
      status: 500, 
      error: 'Internal server error' 
    };
  }
}

async function updateSection(id, data) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid section ID format', 400);
    }

    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid request data', 400);
    }

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new AppError('Section name must be a non-empty string', 400);
      }
    } else {
      throw new AppError('Section name is required for update', 400);
    }

    await connect();
    const Section = makeSection(mongoose);

    const existing = await Section.findById(id).exec();
    if (!existing) {
      throw new AppError('Section not found', 404);
    }

    // Check for duplicate name if name is being changed
    if (data.name.trim() !== existing.name) {
      const duplicate = await Section.findOne({ name: data.name.trim() }).exec();
      if (duplicate) {
        throw new AppError('Section with this name already exists', 409);
      }
    }

    const section = await Section.findByIdAndUpdate(
      id,
      { name: data.name.trim() },
      { new: true, runValidators: true }
    ).exec();

    return { 
      data: section.toObject(), 
      status: 200, 
      error: null 
    };
  } catch (error) {
    if (error.isOperational) {
      return { 
        data: null, 
        status: error.statusCode, 
        error: error.message 
      };
    }
    if (error.code === 11000) {
      return { 
        data: null, 
        status: 409, 
        error: 'Section name must be unique' 
      };
    }
    console.error('Update section error:', error);
    return { 
      data: null, 
      status: 500, 
      error: 'Internal server error' 
    };
  }
}

async function deleteSection(id) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid section ID format', 400);
    }

    await connect();
    const Section = makeSection(mongoose);

    const section = await Section.findByIdAndDelete(id).exec();
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    return { 
      data: section.toObject(), 
      status: 200, 
      error: null 
    };
  } catch (error) {
    if (error.isOperational) {
      return { 
        data: null, 
        status: error.statusCode, 
        error: error.message 
      };
    }
    console.error('Delete section error:', error);
    return { 
      data: null, 
      status: 500, 
      error: 'Internal server error' 
    };
  }
}

module.exports = {
  createSection,
  getSectionById,
  getAllSections,
  updateSection,
  deleteSection
};
