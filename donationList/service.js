const mongoose = require('mongoose');
const connect = require('../db');
const makeDonationListModel = require('./schema');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

async function getAllDonations(limit = 20, page = 1) {
  try {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError('limit must be an integer between 1 and 100', 400);
    }

    if (!Number.isInteger(page) || page < 1) {
      throw new AppError('page must be a positive integer', 400);
    }

    await connect();

    const DonationList = makeDonationListModel(mongoose);
    const skip = (page - 1) * limit;
    const donations = await DonationList.find()
      .sort({ donationDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await DonationList.countDocuments().exec();

    return {
      data: {
        donations: donations.map((donation) => donation.toObject()),
        total,
        limit,
        page
      },
      status: 200,
      error: null
    };
  } catch (error) {
    if (error.isOperational) {
      return {
        data: null,
        status: error.statusCode,
        error: error.message
      };
    }

    console.error('Get all donations error:', error);
    return {
      data: null,
      status: 500,
      error: 'Internal server error'
    };
  }
}

module.exports = {
  getAllDonations
};