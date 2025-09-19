const express = require('express');
const router = express.Router();
const emailOTPController = require('../controllers/emailOTPController');
const smsOTPController = require('../controllers/smsOTPController');
const { customerAuthMiddleware } = require('../middleware/customerAuthMiddleware');

// Email OTP routes
// Send email OTP for registration
router.post('/send-registration-otp', emailOTPController.sendRegistrationOTP);

// Send email OTP for login
router.post('/send-login-otp', emailOTPController.sendLoginOTP);

// Verify email OTP
router.post('/verify-otp', emailOTPController.verifyOTP);

// Resend email OTP
router.post('/resend-otp', emailOTPController.resendOTP);

// SMS OTP routes
// Send SMS OTP for phone number verification (registration)
router.post('/send-phone-otp', smsOTPController.sendPhoneOTP);

// Verify SMS OTP for phone number verification (requires authentication for profile updates)
router.post('/verify-phone-otp', customerAuthMiddleware, smsOTPController.verifyPhoneOTP);

// Send SMS OTP for login
router.post('/send-login-phone-otp', smsOTPController.sendLoginPhoneOTP);

// Verify SMS OTP for login
router.post('/verify-login-phone-otp', smsOTPController.verifyLoginPhoneOTP);

// Get OTP list for a phone number (admin/debug)
router.get('/phone-otp-list/:phoneNumber', smsOTPController.getOTPList);

// Check SMS credits balance
router.get('/sms-credits', smsOTPController.checkCredits);

module.exports = router;
