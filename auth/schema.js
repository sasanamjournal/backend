const { Schema } = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    unique: false,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  passwordHash: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isSubscribed: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'mentor', 'admin', 'super_admin'],
    default: 'user'
  },
  canDownload: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    default: null,
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.generateAuthToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const token = jwt.sign(
    { sub: this._id.toString(), username: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES_IN || '10d' }
  );
  return token;
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

module.exports = function makeUserModel(mongoose) {
  try {
    return mongoose.model('User');
  } catch (e) {
    return mongoose.model('User', userSchema);
  }
};
