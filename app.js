require('dotenv').config();

// ─── VALIDATE REQUIRED ENV VARS ─────────────────────────────────────
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  console.error('❌ Missing required environment variables (MONGO_URI, SESSION_SECRET). Check .env file.');
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Trust Render's reverse proxy (required for secure cookies behind HTTPS proxy)
if (isProduction) app.set('trust proxy', 1);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// CORS — allow frontend
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session (stored in memory — acceptable for hackathon)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: isProduction,              // true on HTTPS (Render), false on localhost
    httpOnly: true,                     // prevent XSS access to cookie
    sameSite: isProduction ? 'none' : 'lax'  // 'none' needed for prod HTTPS
  }
}));

// Make user available in all EJS views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ─── API ROUTES (JSON) — used by the frontend HTML pages ────────────
app.use('/api', require('./routes/api'));

// ─── EJS ROUTES (server-rendered) — original backend views ──────────
app.use('/', require('./routes/auth'));
app.use('/onboarding', require('./routes/onboarding'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/insights', require('./routes/insights'));
app.use('/doctor', require('./routes/doctor'));
app.use('/profile', require('./routes/profile'));

// ─── SERVE FRONTEND STATIC FILES ───────────────────────────────────
// Backend's own public assets (CSS/JS for EJS views)
app.use('/app', express.static(path.join(__dirname, 'public')));

// Frontend static site — served at /site/...
const frontendPath = path.resolve(__dirname, process.env.FRONTEND_PATH || './public/site');
app.use('/site', express.static(frontendPath));

// ─── GLOBAL ERROR HANDLER ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
  res.status(500).send('Something went wrong.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Herlytics running on http://localhost:${PORT}`);
  console.log(`  → Backend EJS app:  http://localhost:${PORT}/login`);
  console.log(`  → Frontend site:    http://localhost:${PORT}/site/index.html`);
  console.log(`  → API endpoints:    http://localhost:${PORT}/api/...`);
});