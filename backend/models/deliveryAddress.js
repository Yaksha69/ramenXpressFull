const mongoose = require('mongoose');

// Delivery Address Schema
const deliveryAddressSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  recipientName: {
    type: String,
    required: [true, 'Recipient full name is required'],
    trim: true
  },
  recipientMobile: {
    type: String,
    required: [true, 'Recipient mobile number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9+\-\s()]+$/.test(v);
      },
      message: 'Please enter a valid mobile number'
    }
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  barangay: {
    type: String,
    required: [true, 'Barangay is required'],
    trim: true
  },
  municipality: {
    type: String,
    required: [true, 'Municipality is required'],
    trim: true
  },
  province: {
    type: String,
    required: [true, 'Province is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'Zip code is required'],
    trim: true
  },
  latitude: {
    type: Number,
    required: false,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: false,
    min: -180,
    max: 180
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
deliveryAddressSchema.index({ customerId: 1 });
deliveryAddressSchema.index({ customerId: 1, isDefault: 1 });

// Virtual for full address
deliveryAddressSchema.virtual('fullAddress').get(function() {
  return `${this.street}, ${this.barangay}, ${this.municipality}, ${this.province} ${this.zipCode}`;
});

// Method to get address summary (for API responses)
deliveryAddressSchema.methods.getAddressSummary = function() {
  return {
    id: this._id,
    recipientName: this.recipientName,
    recipientMobile: this.recipientMobile,
    street: this.street,
    barangay: this.barangay,
    municipality: this.municipality,
    province: this.province,
    zipCode: this.zipCode,
    fullAddress: this.fullAddress,
    isDefault: this.isDefault
  };
};

// Ensure virtual fields are serialized
deliveryAddressSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('DeliveryAddress', deliveryAddressSchema); 