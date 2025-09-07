const express = require('express');
const router = express.Router();
const deliveryAddressController = require('../controllers/deliveryAddressController');
const { customerAuthMiddleware } = require('../middleware/customerAuthMiddleware');

// All delivery address routes require authentication
router.use(customerAuthMiddleware);

// Get all delivery addresses for the authenticated customer
router.get('/all', deliveryAddressController.getDeliveryAddresses);

// Get default delivery address
router.get('/default', deliveryAddressController.getDefaultDeliveryAddress);

// Add a new delivery address
router.post('/add', deliveryAddressController.addDeliveryAddress);

// Update a delivery address
router.put('/:addressId', deliveryAddressController.updateDeliveryAddress);

// Delete a delivery address
router.delete('/:addressId', deliveryAddressController.deleteDeliveryAddress);

// Set default delivery address
router.put('/:addressId/default', deliveryAddressController.setDefaultDeliveryAddress);

module.exports = router; 