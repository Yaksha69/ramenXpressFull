const Customer = require('../models/customer');
const { validatePassword, hashPassword, comparePassword, generateCustomerToken } = require('../middleware/customerAuthMiddleware');
const googleAuthService = require('../services/googleAuthService');
const emailOTPService = require('../services/emailOTPService');

// Initial registration (Step 1) - Create account and send OTP
exports.registerWithEmail = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (firstName, lastName, email, password) are required' 
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

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create customer with unverified email
    const customer = new Customer({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      emailVerified: false,
      authMethod: 'email'
    });

    await customer.save();

    // Automatically send OTP for email verification
    const otpResult = await emailOTPService.sendEmailOTP(email, 'registration');
    
    if (!otpResult.success) {
      // If OTP sending fails, delete the customer
      await Customer.findByIdAndDelete(customer._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    console.log(`✅ Customer registered and OTP sent to ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email,
          emailVerified: false
        },
        verificationEmailSent: true,
        nextStep: 'verify-email'
      }
    });

  } catch (error) {
    console.error('Email registration failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
};

// Verify email with OTP (Step 2) - Complete registration
exports.verifyEmailRegistration = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    // Validate required fields
    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if email is already verified
    if (customer.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Verify OTP
    const otpVerification = await emailOTPService.verifyOTP(email, otpCode, 'registration');
    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update customer verification status
    customer.emailVerified = true;
    customer.emailVerifiedAt = new Date();
    await customer.save();

    // Generate JWT token
    const token = generateCustomerToken(customer._id, customer.email);

    console.log(`✅ Email verified for customer: ${customer.fullName}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Registration completed!',
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email,
          emailVerified: true
        },
        token
      }
    });

  } catch (error) {
    console.error('Email verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
};

// Email login
exports.loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, customer.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!customer.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your email for verification link.',
        requiresEmailVerification: true,
        email: customer.email
      });
    }

    // Generate JWT token
    const token = generateCustomerToken(customer._id, customer.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email,
          authMethod: customer.authMethod,
          emailVerified: customer.emailVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Error logging in customer with email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Google sign-in
exports.googleSignIn = async (req, res) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    const googleResult = await googleAuthService.verifyGoogleToken(googleToken);
    if (!googleResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const { googleId, email, firstName, lastName, emailVerified } = googleResult.data;

    // Check if customer already exists
    let customer = await Customer.findOne({ 
      $or: [{ googleId }, { email }, { googleEmail: email }] 
    });

    if (customer) {
      // Update existing customer with Google info if needed
      if (!customer.googleId) {
        customer.googleId = googleId;
        customer.googleEmail = email;
        customer.authMethod = 'google';
        customer.emailVerified = emailVerified;
        customer.phoneVerified = true; // Google users are considered verified
        await customer.save();
      }
    } else {
      // Create new customer
      customer = new Customer({
        firstName,
        lastName,
        googleId,
        googleEmail: email,
        email: email, // Also store in main email field for consistency
        authMethod: 'google',
        emailVerified: emailVerified,
        phoneVerified: true // Google users are considered verified
      });

      await customer.save();
    }

    // Generate JWT token
    const token = generateCustomerToken(customer._id, customer.email || customer.googleEmail);

    console.log(`✅ Google sign-in successful for: ${customer.fullName}`);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email || customer.googleEmail,
          authMethod: customer.authMethod,
          emailVerified: customer.emailVerified,
          phoneVerified: customer.phoneVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Error with Google sign-in:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};




// Get customer profile
exports.getProfile = async (req, res) => {
  try {
    const customerId = req.customerId;

    const customer = await Customer.findById(customerId).select('-password');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        email: customer.email || customer.googleEmail,
        phone: customer.phone,
        authMethod: customer.authMethod,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified
      }
    });

  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update customer profile
exports.updateProfile = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { firstName, lastName, phone, email } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;

    const customer = await Customer.findByIdAndUpdate(
      customerId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: customer.fullName,
        email: customer.email || customer.googleEmail,
        phone: customer.phone,
        authMethod: customer.authMethod,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified
      }
    });

  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const customerId = req.customerId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has a password (Google users might not have one)
    if (!customer.password) {
      return res.status(400).json({
        success: false,
        message: 'Password change not available for Google-authenticated accounts'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, customer.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    customer.password = hashedNewPassword;
    await customer.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 

// Get customer's own orders
exports.getMyOrders = async (req, res) => {
  try {
    const customerId = req.customerId;
    const MobileOrder = require('../models/mobileOrder');
    console.log('🔍 Fetching orders for customerId:', customerId);
    const orders = await MobileOrder.find({ customerId }).sort({ createdAt: -1 });
    console.log('📦 Orders found:', orders.length, orders);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Create customer's own order
exports.createMyOrder = async (req, res) => {
  try {
    const customerId = req.customerId;
    const customer = req.customer;
    const { items, deliveryMethod, deliveryAddress, paymentMethod, notes } = req.body;
    const subtotal = items.reduce((sum, item) => {
      const addOnsPrice = item.selectedAddOns.reduce((addOnSum, addOn) => addOnSum + addOn.price, 0);
      return sum + ((item.menuItem.price + addOnsPrice) * item.quantity);
    }, 0);
    const deliveryFee = deliveryMethod === 'Delivery' ? 50.0 : 0.0;
    const total = subtotal + deliveryFee;
    const orderId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const MobileOrder = require('../models/mobileOrder');
    const mobileOrder = new MobileOrder({
      orderId,
      items,
      total,
      deliveryMethod,
      deliveryAddress,
      paymentMethod,
      notes,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerId,
      invoiceNumber
    });
    const savedOrder = await mobileOrder.save();
    res.status(201).json({ success: true, data: savedOrder });
  } catch (err) {
    console.error('Error creating customer order:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get customer's specific order
exports.getMyOrderById = async (req, res) => {
  try {
    const customerId = req.customerId;
    const orderId = req.params.id;
    const MobileOrder = require('../models/mobileOrder');
    const order = await MobileOrder.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error fetching customer order:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};



