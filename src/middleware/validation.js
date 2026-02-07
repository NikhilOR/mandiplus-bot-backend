// validation.js
const { body } = require('express-validator');

exports.validateInsuranceRequest = [
  body('userId')
    .exists().withMessage('User ID is required')
    .notEmpty().withMessage('User ID cannot be empty')
    .isString().withMessage('User ID must be a string'),
  
  body('timestamp')
    .exists().withMessage('Timestamp is required')
    .custom((value) => {
      // Accept both ISO string and Unix timestamp (string or number)
      if (!value) {
        throw new Error('Timestamp is required');
      }
      
      // Check if it's a valid Unix timestamp (number or numeric string)
      const timestamp = parseInt(value);
      if (!isNaN(timestamp) && timestamp > 0) {
        return true;
      }
      
      // Check if it's a valid ISO date string
      const date = new Date(value);
      if (date.toString() !== 'Invalid Date') {
        return true;
      }
      
      throw new Error('Invalid timestamp format');
    }),
  
  body('itemName')
    .notEmpty().withMessage('Item name is required')
    .isString().withMessage('Item name must be a string'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .custom((value) => {
      // Accept both number and numeric string
      const qty = parseInt(value);
      if (isNaN(qty)) {
        throw new Error('Quantity must be a number');
      }
      if (qty < 1) {
        throw new Error('Quantity must be at least 1');
      }
      return true;
    }),
  
  body('rate')
    .optional()
    .custom((value) => {
      // Accept both number and numeric string
      if (!value) return true;
      const rateValue = parseFloat(value);
      if (isNaN(rateValue)) {
        throw new Error('Rate must be a valid number');
      }
      return true;
    }),
  
  body('vehicleNo')
    .notEmpty().withMessage('Vehicle number is required')
    .isString().withMessage('Vehicle number must be a string'),
  
  body('consent')
    .notEmpty().withMessage('Consent is required')
    .custom((value) => {
      // Accept: true, false, "true", "false", "TRUE", "FALSE", "yes", "no", "YES", "NO"
      if (typeof value === 'boolean') {
        return true;
      }
      
      const normalizedValue = String(value).toLowerCase().trim();
      
      if (['true', 'false', 'yes', 'no', '1', '0'].includes(normalizedValue)) {
        return true;
      }
      
      throw new Error('Consent must be true, false, yes, or no');
    }),
  
  // Optional fields validation
  body('supplierName')
    .optional()
    .isString().withMessage('Supplier name must be a string'),
  
  body('supplierPlace')
    .optional()
    .isString().withMessage('Supplier place must be a string'),
  
  body('partyName')
    .optional()
    .isString().withMessage('Party name must be a string'),
  
  body('partyAddress')
    .optional()
    .isString().withMessage('Party address must be a string'),
  
  body('transporterName')
    .optional()
    .isString().withMessage('Transporter name must be a string'),
  
  body('cashCommission')
    .optional()
    .isString().withMessage('Cash/Commission must be a string'),
  
  body('invoiceType')
    .optional()
    .isString().withMessage('Invoice type must be a string'),
  
  body('kantaParchiImage')
    .optional()
    .isString().withMessage('Kanta Parchi image URL must be a string')
];

exports.validateApproval = [
  body('adminNotes')
    .optional()
    .isString().withMessage('Admin notes must be a string')
    .isLength({ max: 500 }).withMessage('Admin notes must not exceed 500 characters')
];

exports.validateRejection = [
  body('rejectionReason')
    .notEmpty().withMessage('Rejection reason is required')
    .isString().withMessage('Rejection reason must be a string')
    .isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters')
    .isLength({ max: 500 }).withMessage('Rejection reason must not exceed 500 characters')
];