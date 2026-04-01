const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { error: null });
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  try {
    const { name, username, password, pin } = req.body;

    // Validate username
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.render('auth/register', {
        error: 'Username must be 3–20 characters, letters/numbers/underscore only.'
      });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.render('auth/register', { error: 'Username already taken.' });

    const hashed = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      password: hashed,
      pin: hashedPin
    });

    req.session.user = { id: user._id, name: user.name, username: user.username };
    res.redirect('/onboarding/stage1');

  } catch (err) {
    console.log(err);
    res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.render('auth/login', { error: 'No account found with that username.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('auth/login', { error: 'Incorrect password.' });

    req.session.user = { id: user._id, name: user.name, username: user.username };

    if (!user.onboardingComplete) return res.redirect('/onboarding/stage1');
    res.redirect('/dashboard');

  } catch (err) {
    res.render('auth/login', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;