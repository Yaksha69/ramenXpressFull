const express = require('express');
const router = express.Router();
const mobileOrderController = require('../controllers/mobileOrderController');
const authMiddleware = require('../middleware/authMiddleware');
const { customerAuthMiddleware } = require('../middleware/customerAuthMiddleware');

// Allow only customers to create a mobile order
router.post('/add', customerAuthMiddleware, mobileOrderController.createMobileOrder);

// Customer-specific route to get their own orders
router.get('/my-orders', customerAuthMiddleware, mobileOrderController.getCustomerOrders);

// Admin and cashier can access these endpoints
router.use(authMiddleware);

// Middleware to check if user is admin or cashier
const isAdminOrCashier = function (req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cashier')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admins and cashiers only.' });
};

// GET all mobile orders (admin and cashiers)
router.get('/all', isAdminOrCashier, mobileOrderController.getAllMobileOrders);

// GET mobile order by ID
router.get('/:id', isAdminOrCashier, mobileOrderController.getMobileOrderById);

// PUT update a mobile order by ID
router.put('/update/:id', isAdminOrCashier, mobileOrderController.updateMobileOrder);

// Add this route for updating order status
router.patch('/:orderId/status', isAdminOrCashier, mobileOrderController.updateOrderStatus);

// Add route for cancelling orders (customers can cancel their own orders)
router.patch('/:id/cancel', mobileOrderController.cancelMobileOrder);

// Admin-only route to sync mobile orders to sales
router.post('/sync-to-sales', authMiddleware.isAdmin, mobileOrderController.syncMobileOrdersToSales);

module.exports = router;
