// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const prisma = require('./src/config/database');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// ✅ Trust proxy (MUST be set before rate limiter)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ✅ FIXED Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator - use default behavior
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

app.use('/api/', limiter);


// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Insurance Platform API Docs'
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Import routes
const insuranceRoutes = require('./src/routes/insurance');
const adminRoutes = require('./src/routes/admin');

// Use routes
app.use('/api/insurance', insuranceRoutes);
app.use('/api/admin', adminRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Information
 *     description: Get basic API information and available endpoints
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Insurance Platform API',
    version: '1.0.0',
    status: 'running',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
    endpoints: {
      insurance: {
        create: 'POST /api/insurance/request',
        getById: 'GET /api/insurance/request/:id',
        getByUserId: 'GET /api/insurance/status/:userId'
      },
      admin: {
        pending: 'GET /api/admin/pending',
        all: 'GET /api/admin/requests',
        approve: 'POST /api/admin/approve/:id',
        reject: 'POST /api/admin/reject/:id'
      }
    }
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check if API is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
});