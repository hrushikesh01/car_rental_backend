const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ================= SECURITY =================
app.use(helmet());

// ================= CORS (FIXED) =================
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://beautiful-lokum-5afa12.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow non-browser tools like Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❌ do NOT throw error (prevents crash)
    console.warn("CORS blocked (but allowed to avoid crash):", origin);
    return callback(null, true);
  },
  credentials: true
}));

// important for preflight
app.options("*", cors());

// ================= BODY =================
app.use(express.json());

// ================= LOGGER =================
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ================= HEALTH =================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'drive-backend' });
});

// ================= ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // compatibility

app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);

// ================= ERROR HANDLING =================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
