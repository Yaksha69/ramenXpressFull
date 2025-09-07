const Inventory = require('../models/inventory');

// Helper function to calculate default status based on stocks
const calculateDefaultStatus = (stocks) => {
  if (stocks <= 0) return 'out of stock';
  if (stocks <= 10) return 'low stock';
  return 'in stock';
};

// Get ingredients for POS system
exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await Inventory.find({}, 'name units status stocks');
    
    res.status(200).json({
      success: true,
      count: ingredients.length,
      data: ingredients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ingredients',
      error: error.message
    });
  }
};

// Get all inventory items
exports.getAllInventory = async (req, res) => {
  try {
    const items = await Inventory.find();
    // Add calculated status for reference, but keep original status
    const itemsWithCalculatedStatus = items.map(item => ({
      ...item.toObject(),
      calculatedStatus: calculateDefaultStatus(item.stocks),
      isStatusOverridden: item.status !== calculateDefaultStatus(item.stocks)
    }));
    res.json(itemsWithCalculatedStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single inventory item by ID
exports.getInventoryById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    const calculatedStatus = calculateDefaultStatus(item.stocks);
    const itemWithCalculatedStatus = {
      ...item.toObject(),
      calculatedStatus,
      isStatusOverridden: item.status !== calculatedStatus
    };
    res.json(itemWithCalculatedStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new inventory item
exports.createInventory = async (req, res) => {
  try {
    const { stocks, status, restocked, ...otherData } = req.body;
    
    // Use provided status or calculate default
    const finalStatus = status || calculateDefaultStatus(stocks);
    
    const newItem = new Inventory({
      ...otherData,
      stocks,
      status: finalStatus,
      restocked: new Date() // Automatically set to current date
    });
    await newItem.save();
    
    const calculatedStatus = calculateDefaultStatus(stocks);
    const itemWithCalculatedStatus = {
      ...newItem.toObject(),
      calculatedStatus,
      isStatusOverridden: finalStatus !== calculatedStatus
    };
    res.status(201).json(itemWithCalculatedStatus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update an inventory item
exports.updateInventory = async (req, res) => {
  try {
    const { stocks, status, restocked, ...otherData } = req.body;
    
    // Use provided status or calculate default
    const finalStatus = status || calculateDefaultStatus(stocks);
    
    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id, 
      { 
        ...otherData, 
        stocks, 
        status: finalStatus,
        restocked: new Date() // Automatically update restock date
      }, 
      { new: true }
    );
    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });
    
    const calculatedStatus = calculateDefaultStatus(stocks);
    const itemWithCalculatedStatus = {
      ...updatedItem.toObject(),
      calculatedStatus,
      isStatusOverridden: finalStatus !== calculatedStatus
    };
    res.json(itemWithCalculatedStatus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete an inventory item
exports.deleteInventory = async (req, res) => {
  try {
    const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 