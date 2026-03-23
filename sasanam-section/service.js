const mongoose = require('mongoose');
const makeSection = require('./schema');

// Cache model reference — avoid re-creating on every call
let Section = null;
function getModel() {
  if (!Section) {
    Section = makeSection(mongoose);
  }
  return Section;
}

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

async function createSection(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid request data', 400);
    }

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Section name is required and must be a non-empty string', 400);
    }

    const SectionModel = getModel();

    // Check for duplicate name
    const existing = await SectionModel.findOne({ name: data.name.trim() }).lean().exec();
    if (existing) {
      throw new AppError('Section with this name already exists', 409);
    }

    const section = new SectionModel({
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

    const SectionModel = getModel();
    const section = await SectionModel.findById(id).lean().exec();
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    return { 
      data: section, 
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

    const SectionModel = getModel();
    const skip = (page - 1) * limit;

    // Use lean() for faster serialization and run count in parallel
    const [sections, total] = await Promise.all([
      SectionModel.find()
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      SectionModel.countDocuments()
    ]);

    return { 
      data: {
        sections,
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

    const SectionModel = getModel();

    const existing = await SectionModel.findById(id).lean().exec();
    if (!existing) {
      throw new AppError('Section not found', 404);
    }

    // Check for duplicate name if name is being changed
    if (data.name.trim() !== existing.name) {
      const duplicate = await SectionModel.findOne({ name: data.name.trim() }).lean().exec();
      if (duplicate) {
        throw new AppError('Section with this name already exists', 409);
      }
    }

    const section = await SectionModel.findByIdAndUpdate(
      id,
      { name: data.name.trim() },
      { new: true, runValidators: true }
    ).lean().exec();

    return { 
      data: section, 
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

    const SectionModel = getModel();

    const section = await SectionModel.findByIdAndDelete(id).lean().exec();
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    return { 
      data: section, 
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
