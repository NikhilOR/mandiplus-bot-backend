// insuranceController.js
const prisma = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Helper function to normalize boolean values
 */
function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).toLowerCase().trim();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

/**
 * Helper function to normalize timestamp
 */
function normalizeTimestamp(value) {
  if (!value) return new Date();
  
  // If it's a Unix timestamp (in seconds or milliseconds)
  const timestamp = parseInt(value);
  if (!isNaN(timestamp)) {
    // If it's in seconds (< year 2100 in seconds), convert to milliseconds
    return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  }
  
  // Try parsing as ISO string
  const date = new Date(value);
  return date.toString() !== 'Invalid Date' ? date : new Date();
}

/**
 * Create new insurance request (from Chatrace webhook)
 * POST /api/insurance/request
 */
exports.createInsuranceRequest = async (req, res) => {
  try {
    // Log the incoming data
    console.log('📥 Received request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers:', req.headers);

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      userId,
      timestamp,
      supplierName,
      supplierPlace,
      partyName,
      partyAddress,
      itemName,
      quantity,
      rate,
      vehicleNo,
      transporterName,
      cashCommission,
      invoiceType,
      kantaParchiImage,
      consent
    } = req.body;

    // Validate userId exists
    if (!userId) {
      console.log('❌ Missing userId in request');
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        receivedData: req.body
      });
    }

    // Clean phone number - remove all non-numeric characters
    const cleanUserId = String(userId).replace(/[^0-9]/g, '');
    
    if (!cleanUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid User ID format',
        receivedUserId: userId
      });
    }

    // Normalize consent (handle "TRUE", "true", true, "yes", etc.)
    const consentValue = normalizeBoolean(consent);
    
    if (!consentValue) {
      return res.status(400).json({
        success: false,
        message: 'User consent is required to proceed'
      });
    }

    // Check if userId already exists
    const existingRequest = await prisma.insuranceRequest.findUnique({
      where: { userId: cleanUserId }
    });

    if (existingRequest) {
      console.log('⚠️  Duplicate request for userId:', cleanUserId);
      return res.status(409).json({
        success: false,
        message: 'Request with this User ID already exists',
        requestId: existingRequest.id,
        status: existingRequest.status
      });
    }

    // Base premium at creation: 0.2% of (quantity × rate); cap at Decimal(10,2) max
    const qty = parseInt(quantity);
    const rateNum = rate ? parseFloat(rate) : 0;
    const totalValue = qty * rateNum;
    const MAX_PREMIUM = 99999999.99;
    let basePremiumAmount = totalValue * 0.002;
    if (basePremiumAmount > MAX_PREMIUM) basePremiumAmount = MAX_PREMIUM;

    // Create insurance request
    const insuranceRequest = await prisma.insuranceRequest.create({
      data: {
        userId: cleanUserId,
        timestamp: normalizeTimestamp(timestamp),
        supplierName: supplierName || null,
        supplierPlace: supplierPlace || null,
        partyName: partyName || null,
        partyAddress: partyAddress || null,
        itemName,
        quantity: qty,
        rate: rateNum || null,
        vehicleNo,
        transporterName: transporterName || null,
        cashCommission: cashCommission || null,
        invoiceType: invoiceType || null,
        kantaParchiImage: kantaParchiImage || null,
        consent: consentValue,
        status: 'PENDING_VERIFICATION',
        premiumAmount: basePremiumAmount
      }
    });

    console.log('✅ New insurance request created:', insuranceRequest.id);
    console.log('   User ID:', cleanUserId);
    console.log('   Vehicle:', vehicleNo);
    console.log('   Item:', itemName);
    console.log('   Quantity:', quantity);

    return res.status(201).json({
      success: true,
      message: 'Insurance request created successfully. Awaiting admin verification.',
      data: {
        requestId: insuranceRequest.id,
        userId: insuranceRequest.userId,
        vehicleNo: insuranceRequest.vehicleNo,
        itemName: insuranceRequest.itemName,
        quantity: insuranceRequest.quantity,
        status: insuranceRequest.status,
        createdAt: insuranceRequest.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating insurance request:', error);
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A request with this User ID already exists'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create insurance request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single insurance request by ID
 * GET /api/insurance/request/:id
 */
exports.getInsuranceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const insuranceRequest = await prisma.insuranceRequest.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        adminActions: {
          include: {
            admin: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        },
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!insuranceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Insurance request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: insuranceRequest
    });

  } catch (error) {
    console.error('❌ Error fetching insurance request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get insurance request by userId (for user to check status)
 * GET /api/insurance/status/:userId
 */
exports.getRequestByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Clean the userId (in case it comes with + or other characters)
    const cleanUserId = String(userId).replace(/[^0-9]/g, '');

    const insuranceRequest = await prisma.insuranceRequest.findUnique({
      where: { userId: cleanUserId },
      select: {
        id: true,
        userId: true,
        vehicleNo: true,
        itemName: true,
        quantity: true,
        rate: true,
        supplierName: true,
        partyName: true,
        status: true,
        invoiceNumber: true,
        premiumAmount: true,
        paymentStatus: true,
        paymentLink: true,
        policyNumber: true,
        policyPdfUrl: true,
        createdAt: true,
        adminTimestamp: true,
        rejectionReason: true
      }
    });

    if (!insuranceRequest) {
      return res.status(404).json({
        success: false,
        message: 'No request found for this User ID',
        searchedUserId: cleanUserId
      });
    }

    return res.status(200).json({
      success: true,
      data: insuranceRequest
    });

  } catch (error) {
    console.error('❌ Error fetching request by userId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch request status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};