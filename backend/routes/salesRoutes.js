const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new sale (accessible by both admin and cashier)
router.post('/new-sale', authMiddleware, salesController.createSale);

// Middleware to check if user is admin or cashier
const isAdminOrCashier = function (req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cashier')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admins and cashiers only.' });
};

// Apply admin/cashier check to routes that need access
router.use(authMiddleware);

// Get all sales (admin and cashier)
router.get('/all-sales', isAdminOrCashier, salesController.getAllSales);

// Get a sale by orderID (admin and cashier)
router.get('/order/:orderID', isAdminOrCashier, salesController.getSaleByOrderID);

// Get a sale by ID (admin and cashier)
router.get('/:id', isAdminOrCashier, salesController.getSaleById);

// Update a sale by ID (admin and cashier)
router.put('/update/:id', isAdminOrCashier, salesController.updateSale);

// Delete a sale by ID (admin only - keep this restricted)
router.delete('/delete/:id', authMiddleware.isAdmin, salesController.deleteSale);

module.exports = router;
