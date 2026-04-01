const mongoose = require('mongoose');

const cycleLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  periodStartDate: { type: Date, required: true },
  periodEndDate: { type: Date },
  flowLevel: { type: String, enum: ['spotting', 'light', 'medium', 'heavy'] },
  hasClots: { type: Boolean, default: false },
  symptoms: [String],
  mood: { type: String },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CycleLog', cycleLogSchema);