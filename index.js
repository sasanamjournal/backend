const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./auth/routes');
const { authenticateToken } = require('./auth/middleware');
const razorpayRouter = require('./razorpay/routes');
const sectionRouter = require('./sasanam-section/routes');
const booksRouter = require('./sasanam-books/routes');
const connect = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const port = process.env.PORT || 3000;

const swaggerBase = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express Swagger API',
      version: '1.0.0',
      description: 'A simple Express API documented with Swagger'
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
  apis: ['./routes/*.js', './auth/*.js', './sasanam-section/*.js', './sasanam-books/*.js']
};

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Express + Swagger' });
});

app.use('/auth', authRouter);
app.use('/razorpay', authenticateToken, razorpayRouter);
app.use('/sasanam-section', authenticateToken, sectionRouter);
app.use('/sasanam-books', authenticateToken, booksRouter);

function startServer(p, attempts = 5) {
  const server = app.listen(p, () => {
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
  } catch (err) {
    console.error('Failed to connect to MongoDB on startup. Exiting.');
    process.exit(1);
  }
}

init();
