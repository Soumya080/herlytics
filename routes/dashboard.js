const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');
const { getCycleStats } = require('../controllers/cycleEngine');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  const logs = await CycleLog.find({ userId: user._id }).sort({ periodStartDate: -1 });

  const dates = logs.map(l => l.periodStartDate);
  const stats = getCycleStats(dates);

  res.render('dashboard', { user, stats, logs });
});

// Log a new period
router.post('/log', requireLogin, async (req, res) => {
  const { periodStartDate, flowLevel, hasClots, mood, symptoms } = req.body;
  await CycleLog.create({
    userId: req.session.user.id,
    periodStartDate: new Date(periodStartDate),
    flowLevel,
    hasClots: hasClots === 'on',
    mood,
    symptoms: [].concat(symptoms || [])
  });
  res.redirect('/dashboard');
});

module.exports = router;