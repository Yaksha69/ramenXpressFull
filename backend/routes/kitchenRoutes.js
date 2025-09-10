const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const authMiddleware = require('../middleware/authMiddleware');

// Get kitchen orders
router.get('/orders', authMiddleware, kitchenController.getKitchenOrders);

// Update order status
router.patch('/orders/:orderId/status', authMiddleware, kitchenController.updateOrderStatus);

module.exports = router;
