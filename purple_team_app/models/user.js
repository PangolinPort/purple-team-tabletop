const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_WORK_FACTOR = 12;

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 64 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    maxlength: 254,
    match: /.+@.+\..+/
  },
  password: { type: String, required: true, minlength: 8, maxlength: 128 },
  role: { type: String, enum: ['admin', 'red', 'blue', 'observer'], default: 'observer' },
  createdAt: { type: Date, default: Date.now },
  mfaSecret: { type: String, select: false }
}, {
  versionKey: false
});

UserSchema.pre('save', async function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.mfaSecret;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
