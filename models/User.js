const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pin: { type: String },
  city: { type: String },
  age: { type: Number },
  onboardingComplete: { type: Boolean, default: false },

  // Onboarding answers
  cycleGap: { type: String },        // e.g. "26-30days"
  periodDuration: { type: String },  // e.g. "4-5days"
  physicalSymptoms: [String],
  emotionalSymptoms: [String],
  symptomSeverity: { type: Number },
  stressLevel: { type: String },
  sleepPattern: { type: String },
  dietPattern: { type: String },
  activityLevel: { type: String },
  knownConditions: [String],
  hasDoctorAccess: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);