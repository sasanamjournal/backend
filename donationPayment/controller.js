const donationPaymentService = require('./service');

const createOrder = async (req, res) => {
  try {
    const result = await donationPaymentService.createOrder(req.body);
    console.log('DonationPayment create order controller result:', req.body, req.user && req.user.sub, result);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        code: result.status === 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Donation payment order created successfully',
      data: result.data
    });
  } catch (err) {
    console.error('DonationPayment create order controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const result = await donationPaymentService.verifyPayment(req.body);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        code: result.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Donation payment verified successfully',
      data: result.data
    });
  } catch (err) {
    console.error('DonationPayment verify payment controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
