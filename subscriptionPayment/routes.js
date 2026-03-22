const express = require('express');
const controller = require('./controller');
const {
  validateCreateOrder,
  validateVerifyPayment,
  validatePaymentListQuery
} = require('./middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SubscriptionPayment
 *   description: Subscription payment management APIs
 */

/**
 * @swagger
 * /subscription-payment/order:
 *   post:
 *     summary: Create a subscription payment order
 *     tags: [SubscriptionPayment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Amount in paise
 *               currency:
 *                 type: string
 *                 example: INR
 *               receipt:
 *                 type: string
 *               notes:
 *                 type: object
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/order', validateCreateOrder, controller.createOrder);

/**
 * @swagger
 * /subscription-payment/verify:
 *   post:
 *     summary: Verify a subscription payment and activate subscription
 *     tags: [SubscriptionPayment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Invalid signature or request
 *       404:
 *         description: Order not found
 */
router.post('/verify', validateVerifyPayment, controller.verifyPayment);

/**
 * @swagger
 * /subscription-payment/payments:
 *   get:
 *     summary: Get current user payments
 *     tags: [SubscriptionPayment]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 */
router.get('/payments', validatePaymentListQuery, controller.getPayments);

/**
 * @swagger
 * /subscription-payment/payments/{orderId}:
 *   get:
 *     summary: Get a payment by order ID
 *     tags: [SubscriptionPayment]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment fetched successfully
 *       404:
 *         description: Payment not found
 */
router.get('/payments/:orderId', controller.getPaymentByOrderId);

module.exports = router;