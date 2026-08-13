require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const orderRoutes = require('./routes/orderRoutes');
const stockRoutes = require('./routes/stockRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

connectDB();

// Security headers (sets sensible defaults: no-sniff, no framing, etc.)
app.use(helmet());

app.use(express.json());

// CORS: allow-list driven by env so this isn't hardcoded to localhost once deployed.
// Set FRONTEND_URL in backend/.env, comma-separated for multiple origins
// (e.g. "http://localhost:3000,https://your-deployed-site.com").
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (curl, server-to-server, mobile apps) and any listed origin.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" is not allowed.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Basic rate limiting so a script can't hammer the API. Payment endpoints get
// a tighter limit since they trigger real gateway calls.
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/payment/', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

app.use('/api', orderRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send('RiceShop API is running!');
});

// Simple health check for uptime monitoring / load balancers.
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  res.status(200).json({
    status: 'ok',
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// 404 for unmatched routes.
app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// Centralized error handler — keeps stack traces out of API responses and
// gives every route a single place to fall through to on unexpected errors.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
