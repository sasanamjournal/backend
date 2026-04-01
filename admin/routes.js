const express = require('express');
const mongoose = require('mongoose');
const { requireAdmin } = require('../auth/adminMiddleware');
const makeUserModel = require('../auth/schema');
const makeSubscriptionPaymentModel = require('../subscriptionPayment/schema');
const makeDonationPaymentModel = require('../donationPayment/schema');
const makeDonationListModel = require('../donationList/schema');
const makeUserNewsModel = require('../userNews/schema');
const { makeTeamMemberModel, makeAuthorModel } = require('../about/schema');
const Razorpay = require('razorpay');

const router = express.Router();

// All admin routes require admin auth
router.use(requireAdmin);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ═══════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const SubscriptionPayment = makeSubscriptionPaymentModel(mongoose);
    const DonationPayment = makeDonationPaymentModel(mongoose);
    const DonationList = makeDonationListModel(mongoose);
    const UserNews = makeUserNewsModel(mongoose);

    const [
      totalUsers,
      subscribedUsers,
      adminUsers,
      downloadUsers,
      totalSubPayments,
      paidSubPayments,
      failedSubPayments,
      createdSubPayments,
      totalDonationPayments,
      paidDonationPayments,
      failedDonationPayments,
      totalDonationList,
      totalNews,
      subRevenueAgg,
      donationRevenueAgg,
      recentUsers,
      recentSubPayments,
      recentDonationPayments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSubscribed: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ canDownload: true }),
      SubscriptionPayment.countDocuments(),
      SubscriptionPayment.countDocuments({ status: 'paid' }),
      SubscriptionPayment.countDocuments({ status: 'failed' }),
      SubscriptionPayment.countDocuments({ status: 'created' }),
      DonationPayment.countDocuments(),
      DonationPayment.countDocuments({ status: 'paid' }),
      DonationPayment.countDocuments({ status: 'failed' }),
      DonationList.countDocuments(),
      UserNews.countDocuments(),
      SubscriptionPayment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      DonationPayment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select('-passwordHash'),
      SubscriptionPayment.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'fullName email'),
      DonationPayment.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'fullName email'),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          subscribed: subscribedUsers,
          admins: adminUsers,
          withDownloadAccess: downloadUsers,
        },
        subscriptionPayments: {
          total: totalSubPayments,
          paid: paidSubPayments,
          failed: failedSubPayments,
          pending: createdSubPayments,
          revenue: subRevenueAgg[0]?.total || 0,
        },
        donationPayments: {
          total: totalDonationPayments,
          paid: paidDonationPayments,
          failed: failedDonationPayments,
          revenue: donationRevenueAgg[0]?.total || 0,
        },
        donations: { total: totalDonationList },
        news: { total: totalNews },
        recent: {
          users: recentUsers,
          subscriptionPayments: recentSubPayments,
          donationPayments: recentDonationPayments,
        },
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════
router.get('/users', async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const subscribed = req.query.subscribed;

    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;
    if (subscribed === 'true') filter.isSubscribed = true;
    if (subscribed === 'false') filter.isSubscribed = false;

    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { users, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const { role, canDownload, isSubscribed } = req.body;
    const update = {};
    if (role !== undefined) update.role = role;
    if (canDownload !== undefined) update.canDownload = canDownload;
    if (isSubscribed !== undefined) update.isSubscribed = isSubscribed;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ success: true, message: 'user deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// SUBSCRIPTION PAYMENTS
// ═══════════════════════════════════════════
router.get('/payments/subscriptions', async (req, res) => {
  try {
    const SubscriptionPayment = makeSubscriptionPaymentModel(mongoose);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
        { receipt: { $regex: search, $options: 'i' } },
      ];
    }

    const [payments, total] = await Promise.all([
      SubscriptionPayment.find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SubscriptionPayment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { payments, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin sub payments error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// DONATION PAYMENTS
// ═══════════════════════════════════════════
router.get('/payments/donations', async (req, res) => {
  try {
    const DonationPayment = makeDonationPaymentModel(mongoose);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
      ];
    }

    const [payments, total] = await Promise.all([
      DonationPayment.find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DonationPayment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { payments, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin donation payments error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// FAILED PAYMENTS (both types combined)
// ═══════════════════════════════════════════
router.get('/payments/failed', async (req, res) => {
  try {
    const SubscriptionPayment = makeSubscriptionPaymentModel(mongoose);
    const DonationPayment = makeDonationPaymentModel(mongoose);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [failedSubs, failedDonations, totalSubs, totalDonations] = await Promise.all([
      SubscriptionPayment.find({ status: 'failed' })
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DonationPayment.find({ status: 'failed' })
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SubscriptionPayment.countDocuments({ status: 'failed' }),
      DonationPayment.countDocuments({ status: 'failed' }),
    ]);

    res.json({
      success: true,
      data: {
        subscriptionFailures: failedSubs,
        donationFailures: failedDonations,
        totalSubscriptionFailures: totalSubs,
        totalDonationFailures: totalDonations,
        total: totalSubs + totalDonations,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error('Admin failed payments error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// REFUND PAYMENT
// ═══════════════════════════════════════════
router.post('/payments/refund/:paymentId', async (req, res) => {
  try {
    const { type, amount } = req.body; // type: 'subscription' | 'donation'
    const { paymentId } = req.params;

    if (!type || !['subscription', 'donation'].includes(type)) {
      return res.status(400).json({ error: 'type must be subscription or donation' });
    }

    const Model = type === 'subscription'
      ? makeSubscriptionPaymentModel(mongoose)
      : makeDonationPaymentModel(mongoose);

    const payment = await Model.findOne({ paymentId }).exec();
    if (!payment) return res.status(404).json({ error: 'payment not found' });
    if (payment.status !== 'paid') return res.status(400).json({ error: 'can only refund paid payments' });

    const refundAmount = amount || payment.amount;

    const refund = await razorpay.payments.refund(paymentId, {
      amount: refundAmount * 100, // Razorpay expects paise
    });

    payment.status = 'failed';
    await payment.save();

    // If subscription refund, remove subscription
    if (type === 'subscription' && payment.userId) {
      const User = makeUserModel(mongoose);
      await User.findByIdAndUpdate(payment.userId, { isSubscribed: false });
    }

    res.json({ success: true, data: { refund, payment } });
  } catch (err) {
    console.error('Admin refund error:', err);
    res.status(500).json({ error: err.error?.description || 'refund failed' });
  }
});

// ═══════════════════════════════════════════
// DONATION LIST MANAGEMENT
// ═══════════════════════════════════════════
router.get('/donation-list', async (req, res) => {
  try {
    const DonationList = makeDonationListModel(mongoose);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      DonationList.find().sort({ donationDate: -1 }).skip(skip).limit(limit),
      DonationList.countDocuments(),
    ]);

    res.json({ success: true, data: { donations, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/donation-list/:id', async (req, res) => {
  try {
    const DonationList = makeDonationListModel(mongoose);
    const item = await DonationList.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// NEWS MANAGEMENT
// ═══════════════════════════════════════════
router.get('/news', async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      UserNews.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserNews.countDocuments(),
    ]);

    res.json({ success: true, data: { news, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/news', async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const { title, content, category, imageUrl, isPublished, author } = req.body;
    const news = new UserNews({ title, content, category, imageUrl, isPublished, author });
    await news.save();
    res.status(201).json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/news/:id', async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const news = await UserNews.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!news) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const news = await UserNews.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// TEAM MANAGEMENT
// ═══════════════════════════════════════════
router.get('/team', async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const members = await TeamMember.find().sort({ order: 1 });
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/team', async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const member = new TeamMember(req.body);
    await member.save();
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/team/:id', async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const member = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!member) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/team/:id', async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// AUTHOR MANAGEMENT
// ═══════════════════════════════════════════
router.get('/authors', async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const authors = await Author.find().sort({ order: 1 });
    res.json({ success: true, data: authors });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/authors', async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const author = new Author(req.body);
    await author.save();
    res.status(201).json({ success: true, data: author });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/authors/:id', async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!author) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, data: author });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/authors/:id', async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// PAYMENT DETAILS - Single payment lookup
// ═══════════════════════════════════════════
router.get('/payments/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = type === 'subscription'
      ? makeSubscriptionPaymentModel(mongoose)
      : makeDonationPaymentModel(mongoose);

    const payment = await Model.findById(id).populate('userId', 'fullName email');
    if (!payment) return res.status(404).json({ error: 'payment not found' });

    // Try to fetch Razorpay payment details if paymentId exists
    let razorpayDetails = null;
    if (payment.paymentId) {
      try {
        razorpayDetails = await razorpay.payments.fetch(payment.paymentId);
      } catch (e) {
        // Razorpay fetch may fail, that's ok
      }
    }

    res.json({ success: true, data: { payment, razorpayDetails } });
  } catch (err) {
    console.error('Admin payment detail error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
