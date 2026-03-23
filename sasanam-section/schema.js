const { Schema } = require('mongoose');

const sectionSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Section name is required'],
    trim: true,
    minlength: [1, 'Section name cannot be empty'],
    maxlength: [100, 'Section name cannot exceed 100 characters']
  }
}, { timestamps: true });

// Create unique index on name for better query performance
sectionSchema.index({ name: 1 });

// Avoid OverwriteModelError: reuse existing model if already registered
module.exports = function makeSectionModel(mongoose) {
  try {
    return mongoose.model('Section');
  } catch (e) {
    return mongoose.model('Section', sectionSchema, 'sections');
  }
};
