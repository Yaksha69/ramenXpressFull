const emailOTPService = require('../services/emailOTPService');
const Customer = require('../models/customer');

// Send email OTP for registration
exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if there's already a pending OTP
    const hasPendingOTP = await emailOTPService.hasPendingOTP(email, 'registration');
    if (hasPendingOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP already sent. Please wait before requesting a new one.'
      });
    }

    const result = await emailOTPService.sendEmailOTP(email, 'registration');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification code sent to your email'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send registration OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Send email OTP for login
exports.sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email exists
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Check if there's already a pending OTP
    const hasPendingOTP = await emailOTPService.hasPendingOTP(email, 'login');
    if (hasPendingOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP already sent. Please wait before requesting a new one.'
      });
    }

    const result = await emailOTPService.sendEmailOTP(email, 'login');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification code sent to your email'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify email OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, code, purpose = 'registration' } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const result = await emailOTPService.verifyOTP(email, code, purpose);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resend email OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email, purpose = 'registration' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // For registration, check if email already exists
    if (purpose === 'registration') {
      const existingCustomer = await Customer.findOne({ email });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // For login, check if email exists
    if (purpose === 'login') {
      const customer = await Customer.findOne({ email });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }
    }

    const result = await emailOTPService.resendOTP(email, purpose);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification code resent to your email'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
