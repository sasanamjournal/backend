const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: DonationList
 *   description: Public donation listing APIs
 */

/**
 * @swagger
 * /donation-list:
 *   get:
 *     summary: Get all donation list records
 *     tags: [DonationList]
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
 *         description: Donation list fetched successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/', controller.getAllDonations);

module.exports = router;