function getCycleStats(dates) {
  if (!dates || dates.length === 0) return null;

  // Sort newest first
  const sorted = dates
    .map(d => new Date(d))
    .sort((a, b) => b - a);

  if (sorted.length < 2) {
    // Only 1 date — estimate using 28 days
    const lastPeriod = sorted[0];
    const today = new Date();
    const dayOfCycle = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24)) + 1;
    const nextPeriod = new Date(lastPeriod.getTime() + 28 * 24 * 60 * 60 * 1000);
    return {
      avg: 28,
      min: null,
      max: null,
      variance: null,
      dayOfCycle: Math.max(1, dayOfCycle),
      nextPeriod,
      phase: getPhase(dayOfCycle, 28),
      isIrregular: false,
      totalLogs: 1,
      gaps: []
    };
  }

  // Calculate gaps between consecutive periods
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.round((sorted[i] - sorted[i + 1]) / (1000 * 60 * 60 * 24));
    if (diff > 10 && diff < 100) gaps.push(diff); // filter obvious bad data
  }

  if (gaps.length === 0) return null;

  const avg = Math.round(gaps.reduce((a, b) => a + b) / gaps.length);
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  const variance = max - min;

  const lastPeriod = sorted[0];
  const today = new Date();
  const dayOfCycle = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24)) + 1;
  const nextPeriod = new Date(lastPeriod.getTime() + avg * 24 * 60 * 60 * 1000);

  return {
    avg,
    min,
    max,
    variance,
    dayOfCycle: Math.max(1, dayOfCycle),
    nextPeriod,
    phase: getPhase(dayOfCycle, avg),
    isIrregular: variance > 7,
    totalLogs: sorted.length,
    gaps
  };
}

function getPhase(dayOfCycle, cycleLength) {
  const lutealStart = cycleLength - 14;
  if (dayOfCycle <= 5) return {
    name: 'Menstrual',
    emoji: '🔴',
    tip: 'Rest when you can. Iron-rich foods help — dal, spinach, dates, ragi.',
    hormones: 'Estrogen and progesterone are at their lowest.'
  };
  if (dayOfCycle <= 13) return {
    name: 'Follicular',
    emoji: '🌱',
    tip: 'Energy is rising. Good time to exercise, socialise, and start new things.',
    hormones: 'Estrogen is rising. Follicles are developing.'
  };
  if (dayOfCycle <= lutealStart - 1) return {
    name: 'Ovulation',
    emoji: '✨',
    tip: 'Peak energy and confidence. You may feel more social and sharp.',
    hormones: 'LH surge triggers egg release. Estrogen peaks.'
  };
  return {
    name: 'Luteal',
    emoji: '🌙',
    tip: 'Progesterone rising. Craving carbs, feeling tired, and bloating are all normal.',
    hormones: 'Progesterone rises. PMS symptoms may appear in the final days.'
  };
}

// Format a date nicely: "April 14"
function formatDate(date) {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

// Days until next period
function daysUntil(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

module.exports = { getCycleStats, getPhase, formatDate, daysUntil };