require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./auth/routes');
const { authenticateToken } = require('./auth/middleware');
const subscriptionPaymentRouter = require('./subscriptionPayment/routes');
const donationPaymentRouter = require('./donationPayment/routes');
const donationListRouter = require('./donationList/routes');
const sectionRouter = require('./sasanam-section/routes');
const booksRouter = require('./sasanam-books/routes');
const sasanamBookDetailsRouter = require('./sasanam-book-details/routes');
const userNewsRouter = require('./userNews/routes');
const connect = require('./db');

const app = express();

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/auth', limiter);

const port = process.env.PORT || 3000;

const swaggerBase = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sasanam API',
      version: '1.0.0',
      description: 'Sasanam Document Backend API'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './auth/*.js',
    './subscriptionPayment/*.js',
    './donationPayment/*.js',
    './donationList/*.js',
    './sasanam-section/*.js',
    './sasanam-books/*.js',
    './userNews/*.js',
    './sasanam-book-details/*.js'
  ]
};

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Sasanam API' });
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.use('/auth', authRouter);
app.use('/donation-list', donationListRouter);
app.use('/subscription-payment', authenticateToken, subscriptionPaymentRouter);
app.use('/donation-payment', authenticateToken, donationPaymentRouter);
app.use('/sasanam-section', authenticateToken, sectionRouter);
app.use('/sasanam-books', authenticateToken, booksRouter);

app.use('/user-news', authenticateToken, userNewsRouter);
app.use('/sasanam-book-details', authenticateToken, sasanamBookDetailsRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  res.status(status).json({ success: false, error: message });
});

let activeServer;
function startServer(p, attempts = 5) {
  const server = app.listen(p, () => {
    activeServer = server;
    console.log(`Server listening on port ${p}`);
    const swaggerOptions = Object.assign({}, swaggerBase, {
      definition: Object.assign({}, swaggerBase.definition, {
        servers: [ { url: `http://localhost:${p}` } ]
      })
    });
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log(`Swagger docs available at http://localhost:${p}/api-docs`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${p} is already in use, trying port ${p + 1}...`);
      if (attempts > 0) {
        startServer(p + 1, attempts - 1);
      } else {
        console.error('No available ports found after retries. Exiting.');
        process.exit(1);
      }
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

const parsedPort = parseInt(port, 10) || 3000;

async function init() {
  try {
    await connect();
    startServer(parsedPort);

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      if (!activeServer) process.exit(0);
      activeServer.close(() => {
        const mongoose = require('mongoose');
        mongoose.connection.close(false).then(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
      setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to connect to MongoDB on startup. Exiting.');
    process.exit(1);
  }
}

init();
