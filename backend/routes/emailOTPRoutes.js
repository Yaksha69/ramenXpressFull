const express = require('express');
const router = express.Router();
const emailOTPController = require('../controllers/emailOTPController');

// Public email OTP routes
router.post('/send-registration-otp', emailOTPController.sendRegistrationOTP);
router.post('/send-login-otp', emailOTPController.sendLoginOTP);
router.post('/verify-otp', emailOTPController.verifyOTP);
router.post('/resend-otp', emailOTPController.resendOTP);

module.exports = router;
