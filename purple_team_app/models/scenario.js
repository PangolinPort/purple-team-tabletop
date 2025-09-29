const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  expectedAction: { type: String, maxlength: 2000 },
  outcome: { type: String, maxlength: 2000 }
}, { _id: false });

const ScenarioSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  steps: { type: [StepSchema], default: [] },
  retentionDays: { type: Number, default: 30, min: 1, max: 3650 },
  expireAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  versionKey: false
});

ScenarioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  const days = this.retentionDays || 30;
  this.expireAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  next();
});

ScenarioSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Scenario', ScenarioSchema);
