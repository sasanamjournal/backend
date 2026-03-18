const isPlainObject = (value) => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const validateCreateOrder = (req, res, next) => {
  const { amount, currency, receipt } = req.body || {}; 

  if (!Number.isInteger(amount) || amount < 1) {
    return res.status(400).json({
      success: false,
      error: 'amount must be a positive integer in paise',
      code: 'INVALID_REQUEST'
    });
  }

  if (currency !== undefined) {
    if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency.trim())) {
      return res.status(400).json({
        success: false,
        error: 'currency must be a 3-letter code',
        code: 'INVALID_REQUEST'
      });
    }
  }

  if (receipt !== undefined) {
    if (typeof receipt !== 'string' || receipt.trim().length === 0 || receipt.trim().length > 40) {
      return res.status(400).json({
        success: false,
        error: 'receipt must be a non-empty string up to 40 characters',
        code: 'INVALID_REQUEST'
      });
    }
  }

  next();
};

const validateVerifyPayment = (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'razorpay_order_id is required',
      code: 'INVALID_REQUEST'
    });
  }

  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'razorpay_payment_id is required',
      code: 'INVALID_REQUEST'
    });
  }

  if (!razorpay_signature || typeof razorpay_signature !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'razorpay_signature is required',
      code: 'INVALID_REQUEST'
    });
  }

  next();
};

const validatePaymentListQuery = (req, res, next) => {
  const { limit, page } = req.query || {};

  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        error: 'limit must be an integer between 1 and 100',
        code: 'INVALID_REQUEST'
      });
    }
  }

  if (page !== undefined) {
    const parsedPage = parseInt(page, 10);
    if (Number.isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        error: 'page must be a positive integer',
        code: 'INVALID_REQUEST'
      });
    }
  }

  next();
};

module.exports = {
  validateCreateOrder,
  validateVerifyPayment,
  validatePaymentListQuery
};