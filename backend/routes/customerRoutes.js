const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { customerAuthMiddleware } = require('../middleware/customerAuthMiddleware');

// Public routes (no authentication required)

// Email-based authentication
router.post('/register', customerController.registerWithEmail);
router.post('/verify-email', customerController.verifyEmailRegistration);
router.post('/login', customerController.loginWithEmail);

// Google authentication
router.post('/google-signin', customerController.googleSignIn);


// Protected routes (require authentication)
router.use(customerAuthMiddleware);

router.get('/profile', customerController.getProfile);
router.put('/profile', customerController.updateProfile);
router.put('/change-password', customerController.changePassword);

// Customer mobile orders (customer can only see their own orders)
router.get('/my-orders', customerController.getMyOrders);
router.post('/my-orders', customerController.createMyOrder);
router.get('/my-orders/:id', customerController.getMyOrderById);

module.exports = router; 