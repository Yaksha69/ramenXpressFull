const mongoose = require('mongoose');

// Customer Schema with email and Google authentication support
const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: function() {
      return !this.googleId; // Email is required if not using Google auth
    },
    unique: true,
    sparse: true, // Allows multiple null values
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: false, // Phone is now optional
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required if not using Google auth
    },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  googleEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  // Verification status
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false // Phone verification is now optional
  },
  emailVerifiedAt: {
    type: Date
  },
  phoneVerifiedAt: {
    type: Date
  },
  // Authentication method
  authMethod: {
    type: String,
    enum: ['email', 'phone', 'google'],
    default: 'email'
  }
}, {
  timestamps: true
});

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
customerSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields from JSON output
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('Customer', customerSchema); 