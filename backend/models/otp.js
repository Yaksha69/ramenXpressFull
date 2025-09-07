const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  type: {
    type: String,
    enum: ['email'],
    default: 'email'
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset', 'email_verification'],
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true
});

// Index for faster lookups
otpSchema.index({ email: 1, type: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to find valid OTP
otpSchema.statics.findValidOTP = function(email, code, purpose) {
  return this.findOne({
    email,
    code,
    type: 'email',
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 3 }
  });
};

// Instance method to mark OTP as used
otpSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  return this.save();
};

// Instance method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

module.exports = mongoose.model('OTP', otpSchema);
