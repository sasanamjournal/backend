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
const aboutRouter = require('./about/routes');
const adminRouter = require('./admin/routes');
const emailTemplateRouter = require('./emailTemplate/routes');
const connect = require('./db');

const app = express();

// Security & performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(cors({
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Passport (Google OAuth)
const passport = require('passport');
app.use(passport.initialize());

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
    './sasanam-book-details/*.js',
    './about/*.js'
  ]
};

// Swagger password protection
const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || 'sasanam@123';
const crypto = require('crypto');
const swaggerTokenSecret = crypto.randomBytes(32).toString('hex');

function generateSwaggerToken() {
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const payload = expires.toString();
  const hmac = crypto.createHmac('sha256', swaggerTokenSecret).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function verifySwaggerToken(token) {
  if (!token) return false;
  const [payload, hmac] = token.split('.');
  if (!payload || !hmac) return false;
  const expected = crypto.createHmac('sha256', swaggerTokenSecret).update(payload).digest('hex');
  if (hmac !== expected) return false;
  return Date.now() < parseInt(payload, 10);
}

function getSwaggerCookie(req) {
  const cookie = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('swagger_token='));
  return cookie ? cookie.split('=')[1] : null;
}

function swaggerAuth(req, res, next) {
  if (verifySwaggerToken(getSwaggerCookie(req))) return next();
  return res.redirect('/api-docs');
}

function buildLoginHTML(error) {
  const errorMsg = error ? '<p style="color:#e94560;text-align:center;margin-top:12px;font-size:14px;">Incorrect password. Try again.</p>' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sasanam API Docs - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { background: #16213e; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); width: 100%; max-width: 400px; }
    h1 { color: #e94560; text-align: center; margin-bottom: 8px; font-size: 24px; }
    .subtitle { color: #a8a8b3; text-align: center; margin-bottom: 24px; font-size: 14px; }
    .input-group { margin-bottom: 20px; }
    label { display: block; color: #e2e2e2; margin-bottom: 6px; font-size: 14px; }
    input { width: 100%; padding: 12px 16px; border: 1px solid #0f3460; border-radius: 8px; background: #1a1a2e; color: #fff; font-size: 16px; outline: none; }
    input:focus { border-color: #e94560; }
    button { width: 100%; padding: 12px; background: #e94560; color: #fff; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
    button:hover { background: #c73652; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sasanam API</h1>
    <p class="subtitle">Enter password to access API documentation</p>
    <form method="POST" action="/api-docs/login">
      <div class="input-group">
        <label for="password">Password</label>
        <input type="password" name="password" id="password" placeholder="Enter password" autofocus required />
      </div>
      <button type="submit">Access Docs</button>
      ${errorMsg}
    </form>
  </div>
</body>
</html>`;
}

// Parse URL-encoded form bodies for swagger login
app.use('/api-docs/login', express.urlencoded({ extended: false }));

app.get('/api-docs', (req, res) => {
  if (verifySwaggerToken(getSwaggerCookie(req))) return res.redirect('/api-docs/ui');
  res.send(buildLoginHTML(false));
});

app.post('/api-docs/login', (req, res) => {
  const password = req.body && req.body.password;
  if (password === SWAGGER_PASSWORD) {
    const token = generateSwaggerToken();
    res.setHeader('Set-Cookie', `swagger_token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`);
    return res.redirect('/api-docs/ui');
  }
  res.send(buildLoginHTML(true));
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Sasanam API' });
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const contactRouter = require('./contact/routes');

app.use('/auth', authRouter);
app.use('/contact', contactRouter);
app.use('/donation-list', donationListRouter);
app.use('/about', aboutRouter);
app.use('/subscription-payment', authenticateToken, subscriptionPaymentRouter);
app.use('/donation-payment', authenticateToken, donationPaymentRouter);
app.use('/sasanam-section', authenticateToken, sectionRouter);
app.use('/sasanam-books', authenticateToken, booksRouter);

app.use('/user-news', authenticateToken, userNewsRouter);
app.use('/sasanam-book-details', authenticateToken, sasanamBookDetailsRouter);
app.use('/admin', adminRouter);
app.use('/email-templates', authenticateToken, emailTemplateRouter);

// Image serve route (public, with resize support: ?w=360|640|1080)
const { serveImage } = require('./utils/imageUpload');
app.get('/uploads/*', serveImage);

// Swagger UI (password-protected) - must be before 404 handler
const swaggerRouter = express.Router();
app.use('/api-docs/ui', swaggerAuth, swaggerRouter);

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
    swaggerRouter.use(swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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
