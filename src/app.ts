import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import logger from './utils/logger';
import { setupSwagger } from './config/swagger';
import connectDB from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import milkRoutes from './routes/milk.routes';
import milkPriceRoutes from './routes/milk-price.routes';
import driverRoutes from './routes/driver.routes';
import driverAdminRoutes from './routes/driver-admin.routes';
import dairyCenterRoutes from './routes/dairy-center.routes';
import paymentRoutes from './routes/payment.routes';
import milkCollectionAdminRoutes from './routes/milk-collection-admin.routes';
import reportRoutes from './routes/report.routes';
import centerMilkPriceRoutes from './routes/center-milk-price.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl requests, or Swagger UI)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000', // Swagger UI
      'http://localhost:3001', // Admin Panel
      'http://localhost:3002', // Driver/Center Panel
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ];
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// CORS Middleware - must be before routes
// This automatically handles OPTIONS preflight requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Explicitly handle preflight for all routes

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Akshaya Dairy API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Akshaya Dairy API',
    version: '1.0.0',
    docs: `http://localhost:${PORT}/api-docs`,
    health: `http://localhost:${PORT}/health`,
  });
});

// Swagger Documentation
setupSwagger(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/milk', milkCollectionAdminRoutes);
app.use('/api/milk', centerMilkPriceRoutes);
app.use('/api/milk-price', milkPriceRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver-admin', driverAdminRoutes);
app.use('/api/centers', dairyCenterRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Initialize database connection
  connectDB().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Swagger API Documentation: http://localhost:${PORT}/api-docs`);
      console.log('\n🚀 Server is running!');
      console.log(`📚 Swagger API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health\n`);
    });
  }).catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;

