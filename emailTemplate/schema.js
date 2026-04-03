const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['welcome', 'subscription_confirmed', 'donation_thankyou', 'news_notification', 'new_book_notification'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    heading: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    buttonText: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    buttonUrl: {
      type: String,
      trim: true,
      default: '',
    },
    fromName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'Sasanam',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
