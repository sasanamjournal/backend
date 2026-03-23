const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./auth/controller');
const sectionRouter = require('./sasanam-section/routes');
const booksRouter = require('./sasanam-books/routes');
const connect = require('./db');

const app = express();

// ─── Performance & Security Middleware ────────────────────────────────────────

// Gzip/Brotli compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024,  // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Security & SEO headers (HSTS, CSP, X-Content-Type, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Allow Swagger UI scripts
      styleSrc: ["'self'", "'unsafe-inline'"],    // Allow Swagger UI styles
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: false,  // Allow Swagger UI to load
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS
app.use(cors());

// Request body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (minimal in production)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/auth', limiter);  // Rate limit auth endpoints specifically

// General rate limit (more generous)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use(generalLimiter);

// ─── In-Memory Cache for GET Endpoints ────────────────────────────────────────

const apiCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

function cacheMiddleware(duration) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = '__express__' + req.originalUrl || req.url;
    const cachedResponse = apiCache.get(key);

    if (cachedResponse) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(key, body, duration);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// ─── Request Timeout ──────────────────────────────────────────────────────────

app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout',
        code: 'REQUEST_TIMEOUT'
      });
    }
  });
  next();
});

// ─── Swagger Configuration ────────────────────────────────────────────────────

const port = process.env.PORT || 3000;

const swaggerBase = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sasanam Document API',
      version: '1.0.0',
      description: 'Sasanam Document Management API — Sections & Books'
    }
  },
  apis: ['./routes/*.js', './auth/*.js', './sasanam-section/*.js', './sasanam-books/*.js']
};

// ─── Health Check Endpoint ────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    database: {
      state: states[dbState] || 'unknown',
      connected: dbState === 1
    },
    cache: {
      keys: apiCache.keys().length,
      stats: apiCache.getStats()
    }
  });
});

// ─── Root Endpoint ────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    message: 'Sasanam Document API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      auth: '/auth',
      sections: '/sasanam-section',
      books: '/sasanam-books'
    }
  });
});

// ─── API Routes (with caching on GET endpoints) ──────────────────────────────

app.use('/auth', authRouter);
app.use('/sasanam-section', cacheMiddleware(60), sectionRouter);
app.use('/sasanam-books', cacheMiddleware(60), booksRouter);

// ─── Cache Invalidation on Mutations ──────────────────────────────────────────

// Clear cache when data is modified (POST, PUT, DELETE)
app.use((req, res, next) => {
  const originalEnd = res.end;
  res.end = function (...args) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode < 400) {
      // Flush related cache keys
      const keys = apiCache.keys();
      const basePath = '/' + req.originalUrl.split('/')[1];
      keys.forEach((key) => {
        if (key.includes(basePath)) {
          apiCache.del(key);
        }
      });
    }
    originalEnd.apply(res, args);
  };
  next();
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  });
});

// ─── Server Start ─────────────────────────────────────────────────────────────

function startServer(p, attempts = 5) {
  const server = app.listen(p, () => {
    console.log(`Server listening on port ${p} (PID: ${process.pid})`);
    const swaggerOptions = Object.assign({}, swaggerBase, {
      definition: Object.assign({}, swaggerBase.definition, {
        servers: [{ url: `http://localhost:${p}` }]
      })
    });
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log(`Swagger docs available at http://localhost:${p}/api-docs`);
  });

  // Server-level timeout
  server.timeout = 30000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

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
  } catch (err) {
    console.error('Failed to connect to MongoDB on startup. Exiting.');
    process.exit(1);
  }
}

init();
