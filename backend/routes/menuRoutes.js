const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const multer = require('multer');
const path = require('path');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/menus'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Get all menu items
router.get('/all', menuController.getAllMenu);

// Get menu items by category
router.get('/category/:category', menuController.getMenuByCategory);

// Get add-ons specifically
router.get('/add-ons', menuController.getAddOns);

// Get single menu item by ID
router.get('/:id', menuController.getMenuById);

// Create new menu item
router.post('/newMenu', upload.single('image'), menuController.createMenu);

// Update menu item
router.put('/updateMenu/:id', upload.single('image'), menuController.updateMenu);

// Delete menu item
router.delete('/deleteMenu/:id', menuController.deleteMenu);

module.exports = router;