const crypto = require('crypto');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const connect = require('../db');
const makeRazorpayPaymentModel = require('./schema');
const makeUserModel = require('../auth/schema');

const AppError = require('../utils/AppError');

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError('Missing Razorpay configuration in environment', 500);
  }

  return {
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keySecret
  };
};

const normalizeCurrency = (currency) => {
  return String(currency || 'INR').trim().toUpperCase();
};

const normalizeNotes = (notes) => {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
    return {};
  }

  return Object.entries(notes).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});
};

const buildReceipt = () => {
  return `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createOrder = async (payload, userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid user context', 401);
    }

    const amount = payload && payload.amount;
    
    const currency = normalizeCurrency(payload && payload.currency);
    const receipt = payload && payload.receipt ? String(payload.receipt).trim() : buildReceipt();
    const notes = normalizeNotes(payload && payload.notes);

    if (!Number.isInteger(amount) || amount < 1) {
      throw new AppError('amount must be a positive integer in paise', 400);
    }

    await connect();

    const User = makeUserModel(mongoose);
    const Payment = makeRazorpayPaymentModel(mongoose);
    const user = await User.findById(userId).exec();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { client } = getRazorpayClient();
    const order = await client.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        userId: String(userId),
        ...notes
      }
    });

    const paymentRecord = new Payment({
      userId,
      orderId: order.id,
      receipt: order.receipt,
      amount: order.amount,
      currency: order.currency,
      status: order.status || 'created',
      notes: order.notes || notes
    });

    const savedRecord = await paymentRecord.save();

    return {
      data: {
        order,
        payment: savedRecord.toJSON()
      },
      status: 201,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }

    if (error && error.code === 11000) {
      return { data: null, status: 409, error: 'Receipt or order already exists' };
    }

    console.error('Create Razorpay order error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
};

const verifyPayment = async (payload, userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid user context', 401);
    }

    const orderId = String(payload && payload.razorpay_order_id || '').trim();
    const paymentId = String(payload && payload.razorpay_payment_id || '').trim();
    const signature = String(payload && payload.razorpay_signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      throw new AppError('Missing payment verification fields', 400);
    }

    await connect();

    const Payment = makeRazorpayPaymentModel(mongoose);
    const User = makeUserModel(mongoose);
    const paymentRecord = await Payment.findOne({ orderId, userId }).exec();

    if (!paymentRecord) {
      throw new AppError('Payment order not found', 404);
    }

    const { keySecret } = getRazorpayClient();
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValidSignature =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isValidSignature) {
      paymentRecord.status = 'failed';
      paymentRecord.paymentId = paymentId;
      paymentRecord.signature = signature;
      await paymentRecord.save();
      throw new AppError('Invalid payment signature', 400);
    }

    paymentRecord.paymentId = paymentId;
    paymentRecord.signature = signature;
    paymentRecord.status = 'paid';
    paymentRecord.verifiedAt = new Date();

    await paymentRecord.save();
    const updatedUser = await User.findByIdAndUpdate(userId, { isSubscribed: true }, { new: true }).exec();

    return {
      data: {
        paymentDetails:paymentRecord.toJSON(),
        user:updatedUser.toJSON(),
      },
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }

    console.error('Verify Razorpay payment error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
};

const getPaymentsByUser = async (userId, limit = 20, page = 1) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid user context', 401);
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError('limit must be between 1 and 100', 400);
    }

    if (!Number.isInteger(page) || page < 1) {
      throw new AppError('page must be a positive integer', 400);
    }

    await connect();

    const Payment = makeRazorpayPaymentModel(mongoose);
    const skip = (page - 1) * limit;
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await Payment.countDocuments({ userId }).exec();

    return {
      data: {
        payments: payments.map((payment) => payment.toJSON()),
        total,
        limit,
        page
      },
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }

    console.error('Get Razorpay payments error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
};

const getPaymentByOrderId = async (orderId, userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid user context', 401);
    }

    if (!orderId || typeof orderId !== 'string') {
      throw new AppError('orderId is required', 400);
    }

    await connect();

    const Payment = makeRazorpayPaymentModel(mongoose);
    const payment = await Payment.findOne({ orderId: orderId.trim(), userId }).exec();

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    return {
      data: payment.toJSON(),
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }

    console.error('Get Razorpay payment error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentsByUser,
  getPaymentByOrderId
};