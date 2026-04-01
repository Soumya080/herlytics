const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Home → redirect to login
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

// Show login page
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { error: null });
});

// Show register page
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { error: null });
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, pin } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.render('auth/register', { error: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    const user = await User.create({ name, email, password: hashed, pin: hashedPin });

    req.session.user = { id: user._id, name: user.name, email: user.email };
    res.redirect('/onboarding/stage1');

  } catch (err) {
    res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.render('auth/login', { error: 'No account found with that email.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('auth/login', { error: 'Incorrect password.' });

    req.session.user = { id: user._id, name: user.name, email: user.email };

    if (!user.onboardingComplete) return res.redirect('/onboarding/stage1');
    res.redirect('/dashboard');

  } catch (err) {
    res.render('auth/login', { error: 'Something went wrong. Try again.' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;