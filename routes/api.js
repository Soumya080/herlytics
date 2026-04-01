const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');
const { getCycleStats, formatDate, daysUntil } = require('../controllers/cycleEngine');
const { calculateRisk } = require('../controllers/riskEngine');
const { requireApiAuth } = require('../middleware/auth');

// ─── AUTH ────────────────────────────────────────────────────────────

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { name, username, password, pin } = req.body;

    // DEBUG: log what the backend actually received
    console.log('📥 Register request body:', { name, username, password: password ? '[PRESENT]' : '[MISSING]', pin: pin ? '[PRESENT]' : '[MISSING]' });

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, error: 'Name, username, and password are required.' });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ success: false, error: 'Username must be 3–20 characters, letters/numbers/underscore only.' });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username already taken.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      password: hashed,
      pin: hashedPin
    });

    req.session.user = { id: user._id, name: user.name, username: user.username };

    // Ensure session is saved before responding (prevents race condition)
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error during register:', err);
        return res.status(500).json({ success: false, error: 'Account created but session failed. Please log in.' });
      }
      console.log('✅ Register session saved. Session ID:', req.sessionID);
      res.json({ success: true, user: { id: user._id, name: user.name, username: user.username } });
    });

  } catch (err) {
    // ─── DETAILED ERROR LOGGING ───────────────────────────────────────
    console.error('❌ Register error:', err.message);
    console.error('   Full error:', err);

    // Handle MongoDB duplicate key error (E11000) — race condition safety net
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      return res.status(409).json({ success: false, error: 'Username already taken.' });
    }

    // Mongoose validation error (missing required fields, etc.)
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }

    // DEBUG: temporarily expose real error message (remove in production)
    res.status(500).json({ success: false, error: 'Something went wrong. Try again.', _debug: err.message });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'No account found with that username.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    req.session.user = { id: user._id, name: user.name, username: user.username };
    
    // DEBUG: verify session was saved before responding
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ success: false, error: 'Session save failed.' });
      }
      console.log('✅ Login session saved. Session ID:', req.sessionID);
      console.log('   Session user:', req.session.user);
      res.json({
        success: true,
        user: { id: user._id, name: user.name, username: user.username },
        onboardingComplete: user.onboardingComplete
      });
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Something went wrong. Try again.' });
  }
});

// POST /api/logout (POST prevents CSRF via <img> tags)
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/me — current logged-in user
router.get('/me', requireApiAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('-password -pin');
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ─── DASHBOARD ───────────────────────────────────────────────────────

// GET /api/dashboard
router.get('/dashboard', requireApiAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('-password -pin');
    const logs = await CycleLog.find({ userId: user._id }).sort({ periodStartDate: -1 });

    const dates = logs.map(l => l.periodStartDate);
    const stats = getCycleStats(dates);
    const risk = calculateRisk(user);

    res.json({
      success: true,
      user: { name: user.name, username: user.username, age: user.age, city: user.city },
      stats,
      risk,
      logs: logs.map(l => ({
        date: l.periodStartDate,
        dateFormatted: formatDate(l.periodStartDate),
        flowLevel: l.flowLevel,
        mood: l.mood,
        symptoms: l.symptoms
      })),
      nextPeriod: stats ? {
        date: stats.nextPeriod,
        formatted: formatDate(stats.nextPeriod),
        daysUntil: daysUntil(stats.nextPeriod)
      } : null
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// POST /api/dashboard/log — log a new period
router.post('/dashboard/log', requireApiAuth, async (req, res) => {
  try {
    const { periodStartDate, flowLevel, hasClots, mood, symptoms } = req.body;

    // Validate date
    const parsedDate = new Date(periodStartDate);
    if (!periodStartDate || isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid or missing date.' });
    }

    await CycleLog.create({
      userId: req.session.user.id,
      periodStartDate: parsedDate,
      flowLevel,
      hasClots: !!hasClots,
      mood,
      symptoms: [].concat(symptoms || [])
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Log error:', err);
    res.status(500).json({ success: false, error: 'Failed to log.' });
  }
});

// ─── ASSESSMENT ──────────────────────────────────────────────────────

// POST /api/assessment — compute real risk score from frontend answers
router.post('/assessment', (req, res, next) => {
  // DEBUG: log session state on assessment request
  console.log('🔍 Assessment request — Session ID:', req.sessionID);
  console.log('   Session user:', req.session.user || '❌ NONE (Not logged in)');
  console.log('   Cookies received:', req.headers.cookie || '❌ NO COOKIES');
  next();
}, requireApiAuth, async (req, res) => {
  try {
    const answers = req.body; // { cycle, flow, hair, skin, bmi, energy, mood, diet, exercise, dx }

    // Validate that assessment data was provided
    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ success: false, error: 'No assessment data provided.' });
    }

    // Map frontend assessment answers to user profile fields for risk calculation
    const updateData = {};

    // Map cycle answer
    const cycleMap = { 'lt21': 'less21', '21-28': '21-28', '29-35': '29-35', 'gt35': 'more35', 'irregular': 'irregular', 'none': 'none' };
    if (answers.cycle) updateData.cycleGap = cycleMap[answers.cycle] || answers.cycle;

    // Map physical symptoms
    const physical = [];
    if (answers.hair === 'significant' || answers.hair === 'moderate') physical.push('facial_hair');
    if (answers.skin === 'acne-severe' || answers.skin === 'acne-mod') physical.push('acne');
    if (answers.skin === 'dark-patches') physical.push('acne');
    if (answers.flow === 'very-heavy' || answers.flow === 'heavy') physical.push('heavy_flow');
    if (answers.flow === 'very-light') physical.push('spotting');
    if (physical.length > 0) updateData.physicalSymptoms = physical;

    // Map lifestyle
    if (answers.diet === 'high-sugar' || answers.diet === 'irregular') updateData.dietPattern = 'skipping';
    if (answers.exercise === 'none') updateData.activityLevel = 'too_tired';

    // Map stress from energy (low energy ≈ high stress)
    const energy = parseInt(answers.energy) || 5;
    if (energy <= 3) updateData.stressLevel = 'very_high';
    else if (energy <= 5) updateData.stressLevel = 'high';

    // Map mood
    if (answers.mood === 'severe') updateData.stressLevel = 'very_high';

    // Map sleep (inferred from energy)
    if (energy <= 3) updateData.sleepPattern = 'very_poor';
    else if (energy <= 5) updateData.sleepPattern = 'poor';

    // Map known conditions
    const conditions = [];
    if (answers.dx === 'pcos') conditions.push('pcos');
    if (answers.dx === 'thyroid') conditions.push('thyroid');
    if (answers.dx === 'endo') conditions.push('endometriosis');
    if (answers.dx === 'diabetes') conditions.push('diabetes');
    if (conditions.length > 0) updateData.knownConditions = conditions;

    // Update user profile with assessment data
    const user = await User.findByIdAndUpdate(req.session.user.id, updateData, { new: true });

    // Calculate risk with real engine
    const risk = calculateRisk(user);

    res.json({
      success: true,
      score: risk.score,
      level: risk.level,
      message: risk.message,
      color: risk.color,
      flags: risk.flags,
      ageContext: risk.ageContext
    });

  } catch (err) {
    console.error('Assessment error:', err);
    res.status(500).json({ success: false, error: 'Assessment failed.' });
  }
});

module.exports = router;
