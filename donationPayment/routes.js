const express = require('express');
const controller = require('./controller');
const {
  validateCreateOrder,
  validateVerifyPayment
} = require('./middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: DonationPayment
 *   description: Donation payment management APIs
 */

/**
 * @swagger
 * /donation-payment/order:
 *   post:
 *     summary: Create a donation payment order
 *     tags: [DonationPayment]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Donation amount in paise (e.g. 50000 = ₹500)
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 description: 3-letter currency code
 *                 example: INR
 *               receipt:
 *                 type: string
 *                 description: Optional receipt identifier (max 40 chars)
 *               donorMessage:
 *                 type: string
 *                 description: Optional message from the donor (max 500 chars)
 *               notes:
 *                 type: object
 *                 description: Additional key-value notes
 *     responses:
 *       201:
 *         description: Donation order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/order', validateCreateOrder, controller.createOrder);

/**
 * @swagger
 * /donation-payment/verify:
 *   post:
 *     summary: Verify a donation payment signature
 *     tags: [DonationPayment]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Razorpay order ID returned during order creation
 *               razorpay_payment_id:
 *                 type: string
 *                 description: Razorpay payment ID from the payment callback
 *               razorpay_signature:
 *                 type: string
 *                 description: HMAC-SHA256 signature from the payment callback
 *     responses:
 *       200:
 *         description: Donation payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid signature or missing fields
 *       404:
 *         description: Donation order not found
 *       500:
 *         description: Internal server error
 */
router.post('/verify', validateVerifyPayment, controller.verifyPayment);

module.exports = router;
