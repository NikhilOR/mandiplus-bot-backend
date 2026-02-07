// insurance.js
const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const { validateInsuranceRequest } = require('../middleware/validation');

/**
 * @swagger
 * /api/insurance/request:
 *   post:
 *     summary: Create new insurance request
 *     description: Create a new insurance request from Chatrace webhook
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InsuranceRequest'
 *     responses:
 *       201:
 *         description: Insurance request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InsuranceRequestResponse'
 *       400:
 *         description: Validation error or consent not provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Request with this User ID already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/request',
  validateInsuranceRequest,
  insuranceController.createInsuranceRequest
);

/**
 * @swagger
 * /api/insurance/request/{id}:
 *   get:
 *     summary: Get insurance request by ID
 *     description: Retrieve detailed information about a specific insurance request
 *     tags: [Insurance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Insurance request UUID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Insurance request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       404:
 *         description: Insurance request not found
 *       500:
 *         description: Server error
 */
router.get(
  '/request/:id',
  insuranceController.getInsuranceRequest
);

/**
 * @swagger
 * /api/insurance/status/{userId}:
 *   get:
 *     summary: Get request status by User ID
 *     description: Check insurance request status using User ID (phone number)
 *     tags: [Insurance]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (phone number)
 *         example: 916209415125
 *     responses:
 *       200:
 *         description: Request status retrieved successfully
 *       404:
 *         description: No request found for this User ID
 *       500:
 *         description: Server error
 */
router.get(
  '/status/:userId',
  insuranceController.getRequestByUserId
);

module.exports = router;