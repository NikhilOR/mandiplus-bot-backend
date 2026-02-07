// admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { validateApproval, validateRejection } = require('../middleware/validation');

/**
 * @swagger
 * /api/admin/pending:
 *   get:
 *     summary: Get all pending requests
 *     description: Retrieve all insurance requests awaiting admin verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.get(
  '/pending',
  adminController.getPendingRequests
);

/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     summary: Get all requests with filters
 *     description: Retrieve all insurance requests with optional status filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_VERIFICATION, APPROVED, REJECTED, PAYMENT_PENDING, PAID, POLICY_ISSUED]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of requests
 *       500:
 *         description: Server error
 */
router.get(
  '/requests',
  adminController.getAllRequests
);

/**
 * @swagger
 * /api/admin/approve/{id}:
 *   post:
 *     summary: Approve insurance request
 *     description: Approve a pending insurance request and generate invoice
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Insurance request UUID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApprovalRequest'
 *     responses:
 *       200:
 *         description: Request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Request approved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                     invoiceNumber:
 *                       type: string
 *                     premiumAmount:
 *                       type: number
 *                     paymentLink:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Request already processed
 *       404:
 *         description: Request not found
 *       500:
 *         description: Server error
 */
router.post(
  '/approve/:id',
  validateApproval,
  adminController.approveRequest
);

/**
 * @swagger
 * /api/admin/reject/{id}:
 *   post:
 *     summary: Reject insurance request
 *     description: Reject a pending insurance request with reason
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Insurance request UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectionRequest'
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *       400:
 *         description: Request already processed or invalid data
 *       404:
 *         description: Request not found
 *       500:
 *         description: Server error
 */
router.post(
  '/reject/:id',
  validateRejection,
  adminController.rejectRequest
);

module.exports = router;