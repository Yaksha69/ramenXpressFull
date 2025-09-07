const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Customer = require('../models/customer');

// Password validation middleware
const validatePassword = (password) => {
  // At least 6 characters
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  // At least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: 'Password must contain at least one letter and one number' };
  }
  
  return { isValid: true, message: 'Password is valid' };
};

// Password comparison middleware
const comparePassword = async (candidatePassword, hashedPassword) => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

// Hash password middleware
const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Customer authentication middleware
const customerAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if customer exists
    const customer = await Customer.findById(decoded.customerId).select('-password');
    
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Customer not found.'
      });
    }

    // Add customer info to request
    req.customerId = customer._id;
    req.customer = customer;
    
    next();
  } catch (error) {
    console.error('Customer auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Generate JWT token for customer (updated to handle different identifiers)
const generateCustomerToken = (customerId, identifier) => {
  return jwt.sign(
    { customerId, identifier },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  customerAuthMiddleware,
  validatePassword,
  comparePassword,
  hashPassword,
  generateCustomerToken
}; 