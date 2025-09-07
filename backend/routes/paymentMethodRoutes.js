const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const { customerAuthMiddleware } = require('../middleware/customerAuthMiddleware');

// All payment method routes require authentication
router.use(customerAuthMiddleware);

// Get all payment methods for the authenticated customer
router.get('/all', paymentMethodController.getPaymentMethods);

// Get default payment method
router.get('/default', paymentMethodController.getDefaultPaymentMethod);

// Add a new payment method
router.post('/add', paymentMethodController.addPaymentMethod);

// Update a payment method
router.put('/:paymentMethodId', paymentMethodController.updatePaymentMethod);

// Delete a payment method
router.delete('/:paymentMethodId', paymentMethodController.deletePaymentMethod);

// Set default payment method
router.put('/:paymentMethodId/default', paymentMethodController.setDefaultPaymentMethod);

module.exports = router; 