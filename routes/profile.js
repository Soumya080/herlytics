const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Show profile page
router.get('/', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render('profile', { user, success: null, error: null });
});

// Update basic info
router.post('/update', requireLogin, async (req, res) => {
  try {
    const { name, age, city } = req.body;
    await User.findByIdAndUpdate(req.session.user.id, { name, age: parseInt(age), city });
    req.session.user.name = name;
    const user = await User.findById(req.session.user.id);
    res.render('profile', { user, success: 'Profile updated successfully!', error: null });
  } catch (err) {
    const user = await User.findById(req.session.user.id);
    res.render('profile', { user, success: null, error: 'Update failed. Try again.' });
  }
});

// Update health answers
router.post('/health', requireLogin, async (req, res) => {
  try {
    const physical  = [].concat(req.body.physicalSymptoms  || []);
    const emotional = [].concat(req.body.emotionalSymptoms || []);
    const conditions = [].concat(req.body.knownConditions  || []);

    await User.findByIdAndUpdate(req.session.user.id, {
      cycleGap:          req.body.cycleGap,
      periodDuration:    req.body.periodDuration,
      physicalSymptoms:  physical,
      emotionalSymptoms: emotional,
      symptomSeverity:   req.body.symptomSeverity,
      stressLevel:       req.body.stressLevel,
      sleepPattern:      req.body.sleepPattern,
      dietPattern:       req.body.dietPattern,
      activityLevel:     req.body.activityLevel,
      knownConditions:   conditions,
    });

    const user = await User.findById(req.session.user.id);
    res.render('profile', { user, success: 'Health profile updated!', error: null });
  } catch (err) {
    const user = await User.findById(req.session.user.id);
    res.render('profile', { user, success: null, error: 'Update failed.' });
  }
});

module.exports = router;