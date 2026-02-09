// adminController.js
const prisma = require('../config/database');
const { validationResult } = require('express-validator');
const { sendChatraceMessage } = require('../services/chatraceService');
const { generateInvoicePdf } = require('../services/invoicePdfService');
/**
 * Get all pending insurance requests
 * GET /api/admin/pending
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const pendingRequests = await prisma.insuranceRequest.findMany({
      where: {
        status: 'PENDING_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        userId: true,
        timestamp: true,
        supplierName: true,
        partyName: true,
        itemName: true,
        quantity: true,
        rate: true,
        vehicleNo: true,
        transporterName: true,
        invoiceType: true,
        consent: true,
        status: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests
    });

  } catch (error) {
    console.error('❌ Error fetching pending requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all requests (with filters)
 * GET /api/admin/requests?status=APPROVED&limit=50
 */
exports.getAllRequests = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where = status ? { status } : {};

    const requests = await prisma.insuranceRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        admin: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    const total = await prisma.insuranceRequest.count({ where });

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      data: requests
    });

  } catch (error) {
    console.error('❌ Error fetching requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Approve insurance request
 * POST /api/admin/approve/:id
 */
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const request = await prisma.insuranceRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Insurance request not found'
      });
    }

    if (request.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Use base premium already set at request creation, or recalculate (0.2% of quantity × rate) for older requests; cap at Decimal(10,2) max
    const MAX_PREMIUM = 99999999.99;
    const totalValue = parseFloat(request.quantity) * parseFloat(request.rate || 0);
    let premiumAmount = request.premiumAmount != null
      ? parseFloat(request.premiumAmount)
      : totalValue * 0.002;
    if (premiumAmount > MAX_PREMIUM) premiumAmount = MAX_PREMIUM;
    const invoiceNumber = `INV${Date.now()}`;
    const paymentLink = `https://razorpay.me/temp-link-${invoiceNumber}`;

    // Update request (approval)
    let updatedRequest = await prisma.insuranceRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminAction: 'APPROVED',
        adminTimestamp: new Date(),
        invoiceNumber,
        premiumAmount,
        paymentLink,
        paymentStatus: 'PENDING'
      }
    });

    // Generate invoice PDF (non-blocking: do not fail approval if PDF errors)
    let invoicePdfUrl = null;
    try {
      const pdfFilename = await generateInvoicePdf(request, invoiceNumber, premiumAmount);
      const port = process.env.PORT || 5000;
      const serverUrl = (process.env.APP_URL || `http://localhost:${port}`).replace(/\/$/, '');
      invoicePdfUrl = `${serverUrl}/invoices/${pdfFilename}`;
      updatedRequest = await prisma.insuranceRequest.update({
        where: { id },
        data: { invoicePdfUrl }
      });
    } catch (pdfErr) {
      console.warn('⚠️ Invoice PDF generation failed (approval still succeeded):', pdfErr.message);
    }

    console.log(`✅ Request ${id} approved`);

    // Send WhatsApp notification (non-blocking: do not fail approval if Chatrace errors)
    try {
      const message =
        `🎉 *Your Insurance Request is APPROVED!*\n\n` +
        `Invoice Number: ${invoiceNumber}\n` +
        `Premium Amount: ₹${premiumAmount.toFixed(2)}\n\n` +
        `Please complete payment using this link:\n${paymentLink}\n\n` +
        `After payment, your policy will be issued within 24 hours.`;
      await sendChatraceMessage(request.userId, message);
    } catch (msgErr) {
      console.warn('⚠️ WhatsApp/Chatrace message failed (approval still succeeded):', msgErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Request approved successfully',
      data: {
        requestId: updatedRequest.id,
        invoiceNumber: updatedRequest.invoiceNumber,
        premiumAmount: updatedRequest.premiumAmount,
        paymentLink: updatedRequest.paymentLink,
        invoicePdfUrl: updatedRequest.invoicePdfUrl || null,
        status: updatedRequest.status
      }
    });

  } catch (error) {
    console.error('❌ Error approving request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



/**
 * Reject insurance request
 * POST /api/admin/reject/:id
 */
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const request = await prisma.insuranceRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Insurance request not found'
      });
    }

    if (request.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    const updatedRequest = await prisma.insuranceRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminAction: 'REJECTED',
        adminTimestamp: new Date(),
        rejectionReason
      }
    });

    console.log(`❌ Request ${id} rejected`);

    // Send WhatsApp rejection notification
    const message = 
      `❌ *Your Insurance Request has been REJECTED*\n\n` +
      `Reason: ${rejectionReason}\n\n` +
      `Please contact support for more information or submit a new request with correct details.`;

    await sendChatraceMessage(request.userId, message);

    return res.status(200).json({
      success: true,
      message: 'Request rejected successfully',
      data: {
        requestId: updatedRequest.id,
        status: updatedRequest.status,
        rejectionReason: updatedRequest.rejectionReason
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};