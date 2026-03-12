const { Schema } = require('mongoose');

const razorpayPaymentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  paymentId: {
    type: String,
    sparse: true,
    index: true
  },
  signature: {
    type: String,
    default: null
  },
  receipt: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed'],
    default: 'created',
    index: true
  },
  notes: {
    type: Schema.Types.Mixed,
    default: {}
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = function makeRazorpayPaymentModel(mongoose) {
  try {
    return mongoose.model('RazorpayPayment');
  } catch (e) {
    return mongoose.model('RazorpayPayment', razorpayPaymentSchema);
  }
};