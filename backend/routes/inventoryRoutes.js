const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication and admin check to all inventory routes
router.use(authMiddleware, authMiddleware.isAdmin);

// Get all inventory items
router.get('/all', inventoryController.getAllInventory);
// Get a single inventory item by ID
router.get('/:id', inventoryController.getInventoryById);
// Create a new inventory item
router.post('/create', inventoryController.createInventory);
// Update an inventory item
router.put('/update/:id', inventoryController.updateInventory);
// Delete an inventory item
router.delete('/delete/:id', inventoryController.deleteInventory);

module.exports = router; 