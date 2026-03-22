const subscriptionPaymentService = require('./service');

const createOrder = async (req, res) => {
  console.log("check", req.body);
  try {
    const result = await subscriptionPaymentService.createOrder(req.body, req.user && req.user.sub);
    console.log('SubscriptionPayment create order controller result:', req.body,req.user && req.user.sub, result);
    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        code: result.status === 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription payment order created successfully',
      data: result.data
    });
  } catch (err) {
    console.error('SubscriptionPayment create order controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const result = await subscriptionPaymentService.verifyPayment(req.body, req.user && req.user.sub);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        code: result.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: result.data
    });
  } catch (err) {
    console.error('SubscriptionPayment verify payment controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const result = await subscriptionPaymentService.getPaymentsByUser(req.user && req.user.sub, limit, page);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        code: result.status === 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (err) {
    console.error('SubscriptionPayment get payments controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

const getPaymentByOrderId = async (req, res) => {
  try {
    const result = await subscriptionPaymentService.getPaymentByOrderId(req.params.orderId, req.user && req.user.sub);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error,
        code: result.status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (err) {
    console.error('SubscriptionPayment get payment controller error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPayments,
  getPaymentByOrderId
};