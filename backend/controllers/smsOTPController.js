const smsService = require('../services/smsService');
const Customer = require('../models/customer');

// Send SMS OTP for phone number verification
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, customMessage } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please use a valid Philippine mobile number.'
      });
    }

    // Check if phone number already exists and is verified
    const existingCustomer = await Customer.findOne({ 
      phoneNumber: smsService.formatPhoneNumber(phoneNumber),
      phoneVerified: true 
    });
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered and verified'
      });
    }

    // Send OTP via SMS
    const result = await smsService.sendOTP(phoneNumber, customMessage);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification code sent to your phone number',
        data: {
          phoneNumber: result.data.phoneNumber,
          expiresAt: result.data.expiresAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify SMS OTP for phone number verification
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP code are required'
      });
    }

    // Validate phone number format
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Verify OTP with SMS service
    const result = await smsService.verifyOTP(phoneNumber, otpCode);
    
    if (result.success) {
      const formattedPhoneNumber = smsService.formatPhoneNumber(phoneNumber);
      
      // Update customer phone verification status and phone number
      let customer = null;
      
      if (req.customerId) {
        // Authenticated user - update their phone number and verification status
        customer = await Customer.findById(req.customerId);
        if (customer) {
          customer.phoneNumber = formattedPhoneNumber;
          customer.phoneVerified = true;
          await customer.save();
        }
      } else {
        // Non-authenticated (registration flow) - find by phone number
        customer = await Customer.findOne({ phoneNumber: formattedPhoneNumber });
        if (customer) {
          customer.phoneVerified = true;
          await customer.save();
        }
      }

      res.json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          phoneNumber: formattedPhoneNumber,
          verified: true
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Verify phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Send SMS OTP for login (when customer already exists)
exports.sendLoginPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, customMessage } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please use a valid Philippine mobile number.'
      });
    }

    const formattedPhoneNumber = smsService.formatPhoneNumber(phoneNumber);

    // Check if phone number exists in database
    const customer = await Customer.findOne({ phoneNumber: formattedPhoneNumber });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found. Please register first.'
      });
    }

    // Send OTP via SMS
    const result = await smsService.sendOTP(phoneNumber, customMessage);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification code sent to your phone number',
        data: {
          phoneNumber: result.data.phoneNumber,
          expiresAt: result.data.expiresAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send login phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify SMS OTP for login
exports.verifyLoginPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP code are required'
      });
    }

    // Validate phone number format
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const formattedPhoneNumber = smsService.formatPhoneNumber(phoneNumber);

    // Check if customer exists
    const customer = await Customer.findOne({ phoneNumber: formattedPhoneNumber });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found'
      });
    }

    // Verify OTP with SMS service
    const result = await smsService.verifyOTP(phoneNumber, otpCode);
    
    if (result.success) {
      // Update phone verification status
      customer.phoneVerified = true;
      await customer.save();

      res.json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          phoneNumber: formattedPhoneNumber,
          verified: true,
          customerId: customer._id
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Verify login phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get OTP list for a phone number (for debugging/admin purposes)
exports.getOTPList = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    if (!smsService.validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const result = await smsService.getOTPList(phoneNumber);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Get OTP list error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Check SMS credits balance
exports.checkCredits = async (req, res) => {
  try {
    const result = await smsService.checkCredits();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Check credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
