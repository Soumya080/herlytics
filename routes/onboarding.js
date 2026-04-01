const express = require('express');
const router = express.Router();
const User = require('../models/User');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Stage 1 — Cycle basics
router.get('/stage1', requireLogin, (req, res) => res.render('onboarding/stage1', { error: null }));

router.post('/stage1', requireLogin, async (req, res) => {
  const { cycleGap, periodDuration } = req.body;
  await User.findByIdAndUpdate(req.session.user.id, { cycleGap, periodDuration });
  res.redirect('/onboarding/stage2');
});

// Stage 2 — Symptoms
router.get('/stage2', requireLogin, (req, res) => res.render('onboarding/stage2', { error: null }));

router.post('/stage2', requireLogin, async (req, res) => {
  const physical = [].concat(req.body.physicalSymptoms || []);
  const emotional = [].concat(req.body.emotionalSymptoms || []);
  const severity = req.body.symptomSeverity;
  await User.findByIdAndUpdate(req.session.user.id, {
    physicalSymptoms: physical,
    emotionalSymptoms: emotional,
    symptomSeverity: severity
  });
  res.redirect('/onboarding/stage3');
});

// Stage 3 — Lifestyle
router.get('/stage3', requireLogin, (req, res) => res.render('onboarding/stage3', { error: null }));

router.post('/stage3', requireLogin, async (req, res) => {
  const { stressLevel, sleepPattern, dietPattern, activityLevel } = req.body;
  const conditions = [].concat(req.body.knownConditions || []);
  await User.findByIdAndUpdate(req.session.user.id, {
    stressLevel, sleepPattern, dietPattern, activityLevel,
    knownConditions: conditions
  });
  res.redirect('/onboarding/stage4');
});

// Stage 4 — Past cycle dates
router.get('/stage4', requireLogin, (req, res) => res.render('onboarding/stage4', { error: null }));

router.post('/stage4', requireLogin, async (req, res) => {
  // Dates are saved as CycleLogs
  const CycleLog = require('../models/CycleLog');
  const dates = [req.body.date1, req.body.date2, req.body.date3].filter(Boolean);
  for (const d of dates) {
    await CycleLog.create({ userId: req.session.user.id, periodStartDate: new Date(d) });
  }
  res.redirect('/onboarding/stage5');
});

// Stage 5 — Doctor setup
router.get('/stage5', requireLogin, (req, res) => res.render('onboarding/stage5', { error: null }));

router.post('/stage5', requireLogin, async (req, res) => {
  const { hasDoctorAccess, city } = req.body;
  await User.findByIdAndUpdate(req.session.user.id, {
    hasDoctorAccess, city,
    onboardingComplete: true
  });
  res.redirect('/dashboard');
});

module.exports = router;