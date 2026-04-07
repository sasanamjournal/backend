const crypto = require('crypto');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const connect = require('../db');
const makeDonationPaymentModel = require('./schema');
const makeDonationListModel = require('../donationList/schema');
const makeUserModel = require('../auth/schema');

const AppError = require('../utils/AppError');
const { sendDonationEmail } = require('../utils/emailService');

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
  return `don_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createOrder = async (payload) => {
  try {
    const amount = payload && payload.amount;
    const currency = normalizeCurrency(payload && payload.currency);
    const receipt = payload && payload.receipt ? String(payload.receipt).trim() : buildReceipt();
    const notes = normalizeNotes(payload && payload.notes);
    const donorMessage = payload && payload.donorMessage
      ? String(payload.donorMessage).trim().slice(0, 500)
      : null;

    if (!Number.isInteger(amount) || amount < 1) {
      throw new AppError('amount must be a positive integer in paise', 400);
    }
    await connect();

    const User = makeUserModel(mongoose);
    const Payment = makeDonationPaymentModel(mongoose);
    let userName;
    if (payload.userId) {
    let user = await User.findById(payload.userId).exec();
    userName = user?.fullName || "unknownUser";
    if (!user) {
      userName = "unknownUser";
    }
    }else if (payload.donaterName) {
      userName = "unknownUser";
    }

    const { client } = getRazorpayClient();
    const order = await client.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        userId: payload?.userId ? payload?.userId : null,
        ...notes
      }
    });

    const paymentRecord = new Payment({
      userId: payload?.userId ? payload?.userId : null,
      orderId: order.id,
      receipt: order.receipt,
      amount: order.amount / 100,
      currency: order.currency,
      status: order.status || 'created',
      donorMessage,
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

    console.error('Create donation payment order error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
};

const verifyPayment = async (payload) => {
  try {

    const orderId = String(payload && payload.razorpay_order_id || '').trim();
    const paymentId = String(payload && payload.razorpay_payment_id || '').trim();
    const signature = String(payload && payload.razorpay_signature || '').trim();

    if (!orderId || !paymentId || !signature) {
      throw new AppError('Missing payment verification fields', 400);
    }

    await connect();

    const Payment = makeDonationPaymentModel(mongoose);
    const DonationList = makeDonationListModel(mongoose);
    const User = makeUserModel(mongoose);
    const paymentRecord = await Payment.findOne({ orderId }).exec();

    if (!paymentRecord) {
      throw new AppError('Donation order not found', 404);
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
    let userDetails;
    if(payload?.userId){
    const user = await User.findById(payload?.userId).exec();
    userDetails = user;
    }

    const donaterName = userDetails && userDetails.fullName ? userDetails.fullName : 'anonymous';

    const existingDonation = await DonationList.findOne({
      orderId: paymentRecord.orderId
    }).exec();
    if (!existingDonation) {
      await DonationList.create({
        donaterName,
        donationAmount: paymentRecord.amount,
        orderId: paymentRecord.orderId,
        paymentId: paymentRecord.paymentId,
        donationDate: paymentRecord.verifiedAt
      });
    }
    const email = userDetails ? userDetails && userDetails.email ? userDetails.email : null : donaterName && donaterName.includes('@') ? donaterName : null;
    // Send donation thank-you email (fire-and-forget)
    if (email) {
      sendDonationEmail({
        email,
        name: donaterName,
        amount: paymentRecord.amount,
        orderId: paymentRecord.orderId,
        paymentId: paymentRecord.paymentId,
      });
    }

    return {
      data: paymentRecord.toJSON(),
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return { data: null, status: error.statusCode, error: error.message };
    }

    console.error('Verify donation payment error:', error);
    return { data: null, status: 500, error: 'Internal server error' };
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
