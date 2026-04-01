const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  username:   { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  pin:        { type: String },
  age:        { type: Number },
  city:       { type: String },
  onboardingComplete: { type: Boolean, default: false },

  // Onboarding answers
  cycleGap:          { type: String },
  periodDuration:    { type: String },
  physicalSymptoms:  [String],
  emotionalSymptoms: [String],
  symptomSeverity:   { type: Number },
  stressLevel:       { type: String },
  sleepPattern:      { type: String },
  dietPattern:       { type: String },
  activityLevel:     { type: String },
  knownConditions:   [String],
  hasDoctorAccess:   { type: String },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);