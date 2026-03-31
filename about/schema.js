const { Schema } = require('mongoose');

const teamMemberSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  photo: {
    type: String,
    trim: true,
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const authorSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  photo: {
    type: String,
    trim: true,
    default: ''
  },
  bookName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

function makeTeamMemberModel(mongoose) {
  try {
    return mongoose.model('TeamMember');
  } catch (e) {
    return mongoose.model('TeamMember', teamMemberSchema);
  }
}

function makeAuthorModel(mongoose) {
  try {
    return mongoose.model('Author');
  } catch (e) {
    return mongoose.model('Author', authorSchema);
  }
}

module.exports = { makeTeamMemberModel, makeAuthorModel };
