const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const User = require('./models/User');
const seedData = require('./seed/seed');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { scanAndCreateLoanNotifications } = require('./services/notificationService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const holdRoutes = require('./routes/holdRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const finePaymentRoutes = require('./routes/finePaymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const memberRoutes = require('./routes/memberRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to permit rich interactive frontend scripts & CDNs smoothly
    crossOriginEmbedderPolicy: false
  })
);

// Enable CORS
app.use(cors());

// Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  }
});

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Digital Library Management System API is running smoothly',
    timestamp: new Date(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/holds', holdRoutes);
app.use('/api/membership-plans', membershipRoutes);
app.use('/api/fine-payments', finePaymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for SPA frontend routes
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server Function
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed initial demo dataset if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Database] Database is empty. Auto-seeding initial library data...');
      await seedData(true);
    }

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  Digital Library Management System (P05) Active`);
      console.log(`  Server Port: http://localhost:${PORT}`);
      console.log(`  API Health:  http://localhost:${PORT}/api/health`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    // Run periodic notification scanner for overdue & due soon loans every hour
    setInterval(() => {
      scanAndCreateLoanNotifications();
    }, 60 * 60 * 1000);

    // Initial background scan on boot
    setTimeout(() => {
      scanAndCreateLoanNotifications();
    }, 5000);

    return server;
  } catch (error) {
    console.error('Fatal Server Startup Error:', error.message);
    process.exit(1);
  }
};

// Export app for automated testing and start when run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
