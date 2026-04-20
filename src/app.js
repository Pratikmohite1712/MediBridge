const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration (only allow specified client URL)
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));

// Global rate limiter (100 req per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Auth rate limiter (5 req per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many authentication attempts from this IP, please try again later.' },
});

// Middleware to parse JSON and urlencoded payloads efficiently
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom Data sanitization against XSS
// We use a simple middleware to sanitize all string fields in body, query, params using the xss package
const sanitizeMiddleware = (req, res, next) => {
  const sanitizeObj = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObj(obj[key]);
      }
    });
  };
  sanitizeObj(req.body);
  sanitizeObj(req.query);
  sanitizeObj(req.params);
  next();
};
app.use(sanitizeMiddleware);

// API Routes setup
// API Routes Setup
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const doctorRoutes = require('./routes/doctor.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const consultationRoutes = require('./routes/consultation.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const recordsRoutes = require('./routes/records.routes');
const sosRoutes = require('./routes/sos.routes');
const aiRoutes = require('./routes/ai.routes');
const adminRoutes = require('./routes/admin.routes');
const { globalErrorHandler } = require('./middleware/errorHandler');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handling Middleware (must be registered last)
app.use(globalErrorHandler);

module.exports = app;
