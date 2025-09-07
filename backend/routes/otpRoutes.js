const express = require('express');
const router = express.Router();
const emailOTPController = require('../controllers/emailOTPController');

// Email OTP routes
// Send email OTP for registration
router.post('/send-registration-otp', emailOTPController.sendRegistrationOTP);

// Send email OTP for login
router.post('/send-login-otp', emailOTPController.sendLoginOTP);

// Verify email OTP
router.post('/verify-otp', emailOTPController.verifyOTP);

// Resend email OTP
router.post('/resend-otp', emailOTPController.resendOTP);

module.exports = router;
