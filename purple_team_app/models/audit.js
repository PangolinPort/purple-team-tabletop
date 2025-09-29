const mongoose = require('mongoose');
const crypto = require('crypto');

const AuditSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  userId: { type: String }, // store as string for simplicity
  action: { type: String, required: true },
  target: { type: String },
  details: { type: Object },
  prevHash: { type: String },
  hash: { type: String }
}, { versionKey: false });

AuditSchema.pre('save', async function (next) {
  const payload = JSON.stringify({
    ts: this.ts, userId: this.userId, action: this.action, target: this.target, details: this.details, prevHash: this.prevHash
  });
  this.hash = crypto.createHash('sha256').update(payload).digest('hex');
  next();
});

module.exports = mongoose.model('Audit', AuditSchema);
