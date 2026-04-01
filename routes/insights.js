const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');
const { getCycleStats } = require('../controllers/cycleEngine');
const { calculateRisk } = require('../controllers/riskEngine');
const { requireEjsAuth: requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  const logs = await CycleLog.find({ userId: user._id }).sort({ periodStartDate: -1 });

  const dates = logs.map(l => l.periodStartDate);
  const stats = getCycleStats(dates);
  const risk = calculateRisk(user);

  res.render('insights', { user, stats, logs, risk });
});

module.exports = router;