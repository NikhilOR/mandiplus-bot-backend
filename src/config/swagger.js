// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Insurance Platform API',
      version: '1.0.0',
      description: 'API documentation for Insurance Platform - WhatsApp based insurance request and approval system',
      contact: {
        name: 'API Support',
        email: 'support@insurance-platform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        InsuranceRequest: {
          type: 'object',
          required: ['userId', 'timestamp', 'itemName', 'quantity', 'vehicleNo', 'consent'],
          properties: {
            userId: {
              type: 'string',
              description: 'Unique user identifier (phone number)',
              example: '916209415125'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Request timestamp',
              example: '2024-02-05T10:30:00Z'
            },
            supplierName: {
              type: 'string',
              description: 'Supplier name',
              example: 'ABC Traders'
            },
            supplierPlace: {
              type: 'string',
              description: 'Supplier location',
              example: 'Mumbai'
            },
            partyName: {
              type: 'string',
              description: 'Party name',
              example: 'XYZ Company'
            },
            partyAddress: {
              type: 'string',
              description: 'Party address',
              example: 'Pune, Maharashtra'
            },
            itemName: {
              type: 'string',
              description: 'Item/cargo name',
              example: 'Tender Coconut'
            },
            quantity: {
              type: 'integer',
              description: 'Quantity',
              example: 45
            },
            rate: {
              type: 'number',
              format: 'float',
              description: 'Rate per unit',
              example: 98.50
            },
            vehicleNo: {
              type: 'string',
              description: 'Vehicle registration number',
              example: 'MH12AB1234'
            },
            transporterName: {
              type: 'string',
              description: 'Transporter name',
              example: 'Fast Transport'
            },
            cashCommission: {
              type: 'string',
              description: 'Cash or commission',
              example: 'Cash'
            },
            invoiceType: {
              type: 'string',
              description: 'Type of invoice',
              example: 'buyer invoice'
            },
            kantaParchiImage: {
              type: 'string',
              description: 'URL to kanta parchi image',
              example: 'https://cloudinary.com/image123.jpg'
            },
            consent: {
              type: 'boolean',
              description: 'User consent for insurance',
              example: true
            }
          }
        },
        InsuranceRequestResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Insurance request created successfully'
            },
            data: {
              type: 'object',
              properties: {
                requestId: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000'
                },
                userId: {
                  type: 'string',
                  example: '916209415125'
                },
                vehicleNo: {
                  type: 'string',
                  example: 'MH12AB1234'
                },
                status: {
                  type: 'string',
                  example: 'PENDING_VERIFICATION'
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-02-05T10:30:00Z'
                }
              }
            }
          }
        },
        ApprovalRequest: {
          type: 'object',
          properties: {
            adminNotes: {
              type: 'string',
              description: 'Optional admin notes for approval',
              example: 'All details verified, approved for processing'
            }
          }
        },
        RejectionRequest: {
          type: 'object',
          required: ['rejectionReason'],
          properties: {
            rejectionReason: {
              type: 'string',
              description: 'Reason for rejection (minimum 10 characters)',
              example: 'Invalid vehicle registration number provided'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            error: {
              type: 'string',
              example: 'Detailed error information'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      {
        name: 'Insurance',
        description: 'Insurance request management endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin operations for approval/rejection'
      },
      {
        name: 'Health',
        description: 'API health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './server.js'] // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;