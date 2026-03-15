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
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ];
    if (process.env.VERCEL_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    // Allow Vercel preview deployments and same host
    if (origin && (origin.endsWith('.vercel.app') || origin.includes(process.env.VERCEL_URL || ''))) {
      return callback(null, true);
    }
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
    message: 'Proplay API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

// Root endpoint (docs URL works on Vercel via VERCEL_URL)
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `http://localhost:${PORT}`;
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Proplay – Akshaya Dairy API',
    version: '1.0.0',
    docs: `${baseUrl}/api-docs`,
    health: `${baseUrl}/health`,
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

// Start server only when not on Vercel and not in test
const isVercel = process.env.VERCEL === '1';
if (process.env.NODE_ENV !== 'test' && !isVercel) {
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

