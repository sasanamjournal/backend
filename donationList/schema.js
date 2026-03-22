const { Schema } = require('mongoose');

const donationListSchema = new Schema({
  donaterName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  donationAmount: {
    type: Number,
    required: true,
    min: 1
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  donationDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

module.exports = function makeDonationListModel(mongoose) {
  try {
    return mongoose.model('DonationList');
  } catch (e) {
    return mongoose.model('DonationList', donationListSchema);
  }
};