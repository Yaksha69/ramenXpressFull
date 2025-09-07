const mongoose = require('mongoose');

// Payment Method Schema
const paymentMethodSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  type: {
    type: String,
    enum: ['gcash', 'maya'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentMethodSchema.index({ customerId: 1 });
paymentMethodSchema.index({ customerId: 1, isDefault: 1 });

// Virtual for display name (masked mobile number)
paymentMethodSchema.virtual('displayName').get(function() {
  const lastDigits = this.mobileNumber.length >= 4 
    ? this.mobileNumber.substring(this.mobileNumber.length - 4)
    : this.mobileNumber;
  
  switch (this.type) {
    case 'gcash':
      return `GCash •••• ${lastDigits}`;
    case 'maya':
      return `Maya •••• ${lastDigits}`;
    default:
      return `•••• ${lastDigits}`;
  }
});

// Virtual for masked mobile number
paymentMethodSchema.virtual('maskedMobileNumber').get(function() {
  if (this.mobileNumber.length <= 4) {
    return this.mobileNumber;
  }
  return `•••• ${this.mobileNumber.substring(this.mobileNumber.length - 4)}`;
});

// Method to get masked payment method (for API responses)
paymentMethodSchema.methods.getMaskedData = function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    accountName: this.accountName,
    mobileNumber: this.maskedMobileNumber,
    displayName: this.displayName,
    isDefault: this.isDefault
  };
};

// Ensure virtual fields are serialized
paymentMethodSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema); 