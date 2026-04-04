const express = require('express');
const mongoose = require('mongoose');
const { requireAdmin, requirePermission, flattenPermissions, getRolesFromDB, invalidateRoleCache } = require('../auth/adminMiddleware');
const makeUserModel = require('../auth/schema');
const makeRoleModel = require('../auth/roleSchema');
const makeSubscriptionPaymentModel = require('../subscriptionPayment/schema');
const makeDonationPaymentModel = require('../donationPayment/schema');
const makeDonationListModel = require('../donationList/schema');
const makeUserNewsModel = require('../userNews/schema');
const { makeTeamMemberModel, makeAuthorModel } = require('../about/schema');
const makeSectionModel = require('../sasanam-section/schema');
// Register the Section model so .populate('sectionId') works
makeSectionModel(mongoose);
const Books = require('../sasanam-books/schema');
const upload = require('../sasanam-books/upload');
const Razorpay = require('razorpay');
const { upload: imgUpload, saveImage, deleteImage } = require('../utils/imageUpload');
const { uploadPdf, uploadImage: uploadCoverImage, deleteFromR2 } = require('../utils/r2');
const ContactMessage = require('../contact/schema');
const nodemailer = require('nodemailer');

const router = express.Router();

// All admin routes require admin panel access (mentor, admin, super_admin)
router.use(requireAdmin);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ═══════════════════════════════════════════
// CURRENT USER PERMISSIONS (for frontend)
// ═══════════════════════════════════════════
router.get('/me/permissions', (req, res) => {
  res.json({
    success: true,
    data: {
      role: req.adminUser.role,
      permissions: req.permissions || [],
      roleDoc: req.roleDoc || null,
    },
  });
});

// ═══════════════════════════════════════════
// ROLES MANAGEMENT (from DB)
// ═══════════════════════════════════════════
router.get('/roles', async (req, res) => {
  try {
    const Role = makeRoleModel(mongoose);
    const roles = await Role.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: roles });
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/roles/:id', requirePermission('users.create_admin'), async (req, res) => {
  try {
    const Role = makeRoleModel(mongoose);
    const { permissions, label, description } = req.body;
    const update = {};
    if (permissions !== undefined) update.permissions = permissions;
    if (label !== undefined) update.label = label;
    if (description !== undefined) update.description = description;

    const role = await Role.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!role) return res.status(404).json({ error: 'role not found' });

    // Clear the cached permissions so changes take effect immediately
    invalidateRoleCache();

    res.json({ success: true, data: role });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════
router.get('/dashboard', requirePermission('dashboard.view'), async (req, res) => {
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
      User.countDocuments({ role: { $in: ['admin', 'super_admin'] } }),
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
router.get('/users', requirePermission('users.view'), async (req, res) => {
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

router.put('/users/:id', requirePermission('users.update'), async (req, res) => {
  try {
    const User = makeUserModel(mongoose);
    const { role, canDownload, isSubscribed } = req.body;
    const currentUserRole = req.adminUser.role;
    const update = {};

    // Role change validation
    if (role !== undefined) {
      // Prevent setting a role higher than your own
      if (role === 'super_admin' && currentUserRole !== 'super_admin') {
        return res.status(403).json({ error: 'only super_admin can create super_admin' });
      }
      if (role === 'admin' && currentUserRole !== 'super_admin') {
        return res.status(403).json({ error: 'only super_admin can create admin' });
      }
      if (role === 'mentor' && !['admin', 'super_admin'].includes(currentUserRole)) {
        return res.status(403).json({ error: 'only admin or super_admin can create mentor' });
      }

      // Prevent demoting yourself
      if (req.params.id === req.adminUser._id.toString() && role !== currentUserRole) {
        return res.status(403).json({ error: 'cannot change your own role' });
      }

      // Prevent admin from changing another admin/super_admin's role
      const targetUser = await User.findById(req.params.id).exec();
      if (targetUser) {
        if (['admin', 'super_admin'].includes(targetUser.role) && currentUserRole !== 'super_admin') {
          return res.status(403).json({ error: 'only super_admin can modify admin roles' });
        }
      }

      update.role = role;
    }

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

router.delete('/users/:id', requirePermission('users.delete'), async (req, res) => {
  try {
    const User = makeUserModel(mongoose);

    // Prevent deleting yourself
    if (req.params.id === req.adminUser._id.toString()) {
      return res.status(403).json({ error: 'cannot delete yourself' });
    }

    // Prevent non-super_admin from deleting admin/super_admin
    const targetUser = await User.findById(req.params.id).exec();
    if (targetUser && ['admin', 'super_admin'].includes(targetUser.role) && req.adminUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'only super_admin can delete admin accounts' });
    }

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
router.get('/payments/subscriptions', requirePermission('payments.view'), async (req, res) => {
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
router.get('/payments/donations', requirePermission('payments.view'), async (req, res) => {
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
router.get('/payments/failed', requirePermission('payments.view'), async (req, res) => {
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
router.post('/payments/refund/:paymentId', requirePermission('payments.refund'), async (req, res) => {
  try {
    const { type, amount } = req.body;
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
      amount: refundAmount,
    });

    payment.status = 'failed';
    await payment.save();

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
router.get('/donation-list', requirePermission('donations.view'), async (req, res) => {
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

router.delete('/donation-list/:id', requirePermission('donations.delete'), async (req, res) => {
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
router.get('/news', requirePermission('news.view'), async (req, res) => {
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

router.post('/news', requirePermission('news.create'), imgUpload.single('image'), async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const { title, content, category, isPublished, author } = req.body;
    const data = { title, content, category, isPublished, author };
    if (req.file) data.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    const news = new UserNews(data);
    await news.save();
    res.status(201).json({ success: true, data: news });
  } catch (err) {
    console.error('Create news error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/news/:id', requirePermission('news.update'), imgUpload.single('image'), async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const existing = await UserNews.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const update = { ...req.body };
    if (req.body.removeImage === 'true') {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = '';
    }
    if (req.file) {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    }
    delete update.removeImage;
    const news = await UserNews.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: news });
  } catch (err) {
    console.error('Update news error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/news/:id', requirePermission('news.delete'), async (req, res) => {
  try {
    const UserNews = makeUserNewsModel(mongoose);
    const news = await UserNews.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ error: 'not found' });
    deleteImage(news.imageUrl);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// TEAM MANAGEMENT
// ═══════════════════════════════════════════
router.get('/team', requirePermission('team.view'), async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const members = await TeamMember.find().sort({ order: 1 });
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/team', requirePermission('team.create'), imgUpload.single('photo'), async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const data = { ...req.body };
    if (req.file) data.photo = await saveImage(req.file.buffer, req.file.originalname);
    const member = new TeamMember(data);
    await member.save();
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/team/:id', requirePermission('team.update'), imgUpload.single('photo'), async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const existing = await TeamMember.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const update = { ...req.body };
    // Remove photo
    if (req.body.removePhoto === 'true') {
      if (existing.photo && !existing.photo.startsWith('http')) deleteImage(existing.photo);
      update.photo = '';
    }
    // Replace photo
    if (req.file) {
      if (existing.photo && !existing.photo.startsWith('http')) deleteImage(existing.photo);
      update.photo = await saveImage(req.file.buffer, req.file.originalname);
    }
    delete update.removePhoto;
    const member = await TeamMember.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: member });
  } catch (err) {
    console.error('Update team error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/team/:id', requirePermission('team.delete'), async (req, res) => {
  try {
    const TeamMember = makeTeamMemberModel(mongoose);
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ error: 'not found' });
    deleteImage(member.photo);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// AUTHOR MANAGEMENT
// ═══════════════════════════════════════════
router.get('/authors', requirePermission('authors.view'), async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const authors = await Author.find().sort({ order: 1 });
    res.json({ success: true, data: authors });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/authors', requirePermission('authors.create'), imgUpload.single('photo'), async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const data = { ...req.body };
    if (req.file) data.photo = await saveImage(req.file.buffer, req.file.originalname);
    const author = new Author(data);
    await author.save();
    res.status(201).json({ success: true, data: author });
  } catch (err) {
    console.error('Create author error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/authors/:id', requirePermission('authors.update'), imgUpload.single('photo'), async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const existing = await Author.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const update = { ...req.body };
    if (req.body.removePhoto === 'true') {
      if (existing.photo && !existing.photo.startsWith('http')) deleteImage(existing.photo);
      update.photo = '';
    }
    if (req.file) {
      if (existing.photo && !existing.photo.startsWith('http')) deleteImage(existing.photo);
      update.photo = await saveImage(req.file.buffer, req.file.originalname);
    }
    delete update.removePhoto;
    const author = await Author.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: author });
  } catch (err) {
    console.error('Update author error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/authors/:id', requirePermission('authors.delete'), async (req, res) => {
  try {
    const Author = makeAuthorModel(mongoose);
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) return res.status(404).json({ error: 'not found' });
    deleteImage(author.photo);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// CONTACT MESSAGES MANAGEMENT
// ═══════════════════════════════════════════
router.get('/contacts', requirePermission('news.view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status || null;
    const filter = status ? { status } : {};

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactMessage.countDocuments(filter),
    ]);
    res.json({ success: true, data: { messages, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/contacts/:id/read', requirePermission('news.view'), async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true });
    if (!msg) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/contacts/:id/reply', requirePermission('news.create'), async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ error: 'Reply message is required' });

    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'not found' });

    // Send email reply
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"Sasanam" <${smtpUser}>`,
        to: msg.email,
        subject: `Re: Your message to Sasanam`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#8B4513;">Sasanam</h2>
            <p>Dear ${msg.name},</p>
            <p>${reply.replace(/\n/g, '<br>')}</p>
            <hr style="border:none;border-top:1px solid #e2c9a0;margin:20px 0;">
            <p style="color:#6A5A4A;font-size:12px;">This is a reply to your message: "${msg.message.substring(0, 100)}..."</p>
          </div>
        `,
      });
    }

    msg.adminReply = reply.trim();
    msg.status = 'replied';
    msg.repliedAt = new Date();
    await msg.save();

    res.json({ success: true, data: msg });
  } catch (err) {
    console.error('Reply contact error:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

router.delete('/contacts/:id', requirePermission('news.delete'), async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// SECTIONS MANAGEMENT (Journal Headers)
// ═══════════════════════════════════════════
router.get('/sections', requirePermission('authors.view'), async (req, res) => {
  try {
    const Section = makeSectionModel(mongoose);
    const sections = await Section.find().sort({ createdAt: -1 }).lean();
    // Count books per section
    const sectionIds = sections.map(s => s._id);
    const bookCounts = await Books.aggregate([
      { $match: { sectionId: { $in: sectionIds } } },
      { $group: { _id: '$sectionId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    bookCounts.forEach(b => { countMap[b._id.toString()] = b.count; });
    const data = sections.map(s => ({ ...s, bookCount: countMap[s._id.toString()] || 0 }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get sections error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/sections', requirePermission('authors.create'), async (req, res) => {
  try {
    const Section = makeSectionModel(mongoose);
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Section name is required' });
    const existing = await Section.findOne({ name: name.trim() }).lean();
    if (existing) return res.status(409).json({ error: 'Section name already exists' });
    const section = new Section({ name: name.trim() });
    await section.save();
    res.status(201).json({ success: true, data: section });
  } catch (err) {
    console.error('Create section error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/sections/:id', requirePermission('authors.update'), async (req, res) => {
  try {
    const Section = makeSectionModel(mongoose);
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Section name is required' });
    const duplicate = await Section.findOne({ name: name.trim(), _id: { $ne: req.params.id } }).lean();
    if (duplicate) return res.status(409).json({ error: 'Section name already exists' });
    const section = await Section.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
    if (!section) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, data: section });
  } catch (err) {
    console.error('Update section error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/sections/:id', requirePermission('authors.delete'), async (req, res) => {
  try {
    const Section = makeSectionModel(mongoose);
    // Check if section has books
    const bookCount = await Books.countDocuments({ sectionId: req.params.id });
    if (bookCount > 0) return res.status(400).json({ error: `Cannot delete section with ${bookCount} book(s). Delete the books first.` });
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    console.error('Delete section error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// BOOKS MANAGEMENT (with PDF + Cover Image upload)
// ═══════════════════════════════════════════
router.get('/books', requirePermission('authors.view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.search) filter.bookName = { $regex: req.query.search, $options: 'i' };

    const [books, total] = await Promise.all([
      Books.find(filter).populate('sectionId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Books.countDocuments(filter),
    ]);
    res.json({ success: true, data: { books, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get books error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/books', requirePermission('authors.create'), upload.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const { bookName, authorName, sectionId, description, bookType } = req.body;
    if (!bookName || !authorName || !sectionId) {
      return res.status(400).json({ error: 'bookName, authorName, and sectionId are required' });
    }

    const bookData = {
      bookName: bookName.trim(),
      authorName: authorName.trim(),
      sectionId,
      description: (description || '').trim(),
      bookType: bookType === 'fullbook' ? 'fullbook' : 'journal',
    };

    if (req.files && req.files.pdfFile && req.files.pdfFile[0]) {
      bookData.pdfFile = await uploadPdf(req.files.pdfFile[0].buffer, req.files.pdfFile[0].originalname);
    }
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      bookData.coverImage = await uploadCoverImage(req.files.coverImage[0].buffer, req.files.coverImage[0].originalname);
    }

    const book = new Books(bookData);
    await book.save();
    const populated = await Books.findById(book._id).populate('sectionId', 'name').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('Create book error:', err);
    if (err.code === 11000) return res.status(409).json({ error: 'Duplicate book' });
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/books/:id', requirePermission('authors.update'), upload.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const existing = await Books.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });

    const { bookName, authorName, sectionId, description, bookType } = req.body;
    const update = {};
    if (bookName !== undefined) update.bookName = bookName.trim();
    if (authorName !== undefined) update.authorName = authorName.trim();
    if (sectionId !== undefined) update.sectionId = sectionId;
    if (description !== undefined) update.description = description.trim();
    if (bookType !== undefined) update.bookType = bookType === 'fullbook' ? 'fullbook' : 'journal';

    if (req.files && req.files.pdfFile && req.files.pdfFile[0]) {
      if (existing.pdfFile) await deleteFromR2(existing.pdfFile);
      update.pdfFile = await uploadPdf(req.files.pdfFile[0].buffer, req.files.pdfFile[0].originalname);
    }
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      if (existing.coverImage) await deleteFromR2(existing.coverImage);
      update.coverImage = await uploadCoverImage(req.files.coverImage[0].buffer, req.files.coverImage[0].originalname);
    }

    const book = await Books.findByIdAndUpdate(req.params.id, update, { new: true }).populate('sectionId', 'name').lean();
    res.json({ success: true, data: book });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/books/:id', requirePermission('authors.delete'), async (req, res) => {
  try {
    const book = await Books.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'not found' });

    // Delete associated files from R2
    if (book.pdfFile) await deleteFromR2(book.pdfFile);
    if (book.coverImage) await deleteFromR2(book.coverImage);

    await Books.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// PAYMENT DETAILS - Single payment lookup
// ═══════════════════════════════════════════
router.get('/payments/:type/:id', requirePermission('payments.view'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = type === 'subscription'
      ? makeSubscriptionPaymentModel(mongoose)
      : makeDonationPaymentModel(mongoose);

    const payment = await Model.findById(id).populate('userId', 'fullName email');
    if (!payment) return res.status(404).json({ error: 'payment not found' });

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

// ═══════════════════════════════════════════
// LIBRARY LINKS MANAGEMENT
// ═══════════════════════════════════════════
const makeLibraryLinkModel = require('../library/schema');

router.get('/library-links', requirePermission('news.view'), async (req, res) => {
  try {
    const LibraryLink = makeLibraryLinkModel(mongoose);
    const links = await LibraryLink.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: links });
  } catch (err) {
    console.error('Get library links error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/library-links', requirePermission('news.create'), imgUpload.single('image'), async (req, res) => {
  try {
    const LibraryLink = makeLibraryLinkModel(mongoose);
    const data = { ...req.body };
    if (req.file) data.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    const link = new LibraryLink(data);
    await link.save();
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    console.error('Create library link error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/library-links/:id', requirePermission('news.update'), imgUpload.single('image'), async (req, res) => {
  try {
    const LibraryLink = makeLibraryLinkModel(mongoose);
    const existing = await LibraryLink.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const update = { ...req.body };
    if (req.body.removeImage === 'true') {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = '';
    }
    if (req.file) {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    }
    delete update.removeImage;
    const link = await LibraryLink.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: link });
  } catch (err) {
    console.error('Update library link error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/library-links/:id', requirePermission('news.delete'), async (req, res) => {
  try {
    const LibraryLink = makeLibraryLinkModel(mongoose);
    const link = await LibraryLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ error: 'not found' });
    if (link.imageUrl && !link.imageUrl.startsWith('http')) deleteImage(link.imageUrl);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// ARCHIVE ITEMS MANAGEMENT
// ═══════════════════════════════════════════
const makeArchiveItemModel = require('../archive/schema');

router.get('/archive-items', requirePermission('news.view'), async (req, res) => {
  try {
    const ArchiveItem = makeArchiveItemModel(mongoose);
    const items = await ArchiveItem.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('Get archive items error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/archive-items', requirePermission('news.create'), imgUpload.single('image'), async (req, res) => {
  try {
    const ArchiveItem = makeArchiveItemModel(mongoose);
    const data = { ...req.body };
    if (req.file) data.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    const item = new ArchiveItem(data);
    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error('Create archive item error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/archive-items/:id', requirePermission('news.update'), imgUpload.single('image'), async (req, res) => {
  try {
    const ArchiveItem = makeArchiveItemModel(mongoose);
    const existing = await ArchiveItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const update = { ...req.body };
    if (req.body.removeImage === 'true') {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = '';
    }
    if (req.file) {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    }
    delete update.removeImage;
    const item = await ArchiveItem.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Update archive item error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/archive-items/:id', requirePermission('news.delete'), async (req, res) => {
  try {
    const ArchiveItem = makeArchiveItemModel(mongoose);
    const item = await ArchiveItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    if (item.imageUrl && !item.imageUrl.startsWith('http')) deleteImage(item.imageUrl);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// ═══════════════════════════════════════════
// RESOURCE CENTERS MANAGEMENT (Community)
// ═══════════════════════════════════════════
const makeResourceCenterModel = require('../community/schema');

router.get('/resource-centers', requirePermission('news.view'), async (req, res) => {
  try {
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const centers = await ResourceCenter.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: centers });
  } catch (err) {
    console.error('Get resource centers error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/resource-centers', requirePermission('news.create'), imgUpload.single('image'), async (req, res) => {
  try {
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const data = { ...req.body };
    if (req.file) data.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    const center = new ResourceCenter(data);
    await center.save();
    res.status(201).json({ success: true, data: center });
  } catch (err) {
    console.error('Create resource center error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.put('/resource-centers/:id', requirePermission('news.update'), imgUpload.single('image'), async (req, res) => {
  try {
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const existing = await ResourceCenter.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const update = { ...req.body };
    if (req.body.removeImage === 'true') {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = '';
    }
    if (req.file) {
      if (existing.imageUrl && !existing.imageUrl.startsWith('http')) deleteImage(existing.imageUrl);
      update.imageUrl = await saveImage(req.file.buffer, req.file.originalname);
    }
    delete update.removeImage;
    const center = await ResourceCenter.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: center });
  } catch (err) {
    console.error('Update resource center error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/resource-centers/:id', requirePermission('news.delete'), async (req, res) => {
  try {
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const center = await ResourceCenter.findByIdAndDelete(req.params.id);
    if (!center) return res.status(404).json({ error: 'not found' });
    if (center.imageUrl && !center.imageUrl.startsWith('http')) deleteImage(center.imageUrl);
    res.json({ success: true, message: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
