const Inventory = require('../models/inventory');
const Settings = require('../models/settings');

// Helper function to calculate default status based on stocks
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

// Fetch threshold once per request; fallback to default
async function getLowStockThreshold() {
  try {
    const doc = await Settings.findOne({ key: 'lowStockThreshold' });
    const val = parseInt(doc?.value ?? DEFAULT_LOW_STOCK_THRESHOLD, 10);
    return isNaN(val) || val < 1 ? DEFAULT_LOW_STOCK_THRESHOLD : val;
  } catch (e) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
}

const calculateDefaultStatus = (stocks, threshold = DEFAULT_LOW_STOCK_THRESHOLD) => {
  if (stocks <= 0) return 'out of stock';
  if (stocks <= threshold) return 'low stock';
  return 'in stock';
};

// Get all inventory items
exports.getAllInventory = async (req, res) => {
  try {
    const threshold = await getLowStockThreshold();
    const items = await Inventory.find();
    // Add calculated status for reference, but keep original status
    const itemsWithCalculatedStatus = items.map(item => ({
      ...item.toObject(),
      calculatedStatus: calculateDefaultStatus(item.stocks, threshold),
      isStatusOverridden: item.status !== calculateDefaultStatus(item.stocks, threshold)
    }));
    res.json(itemsWithCalculatedStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single inventory item by ID
exports.getInventoryById = async (req, res) => {
  try {
    const threshold = await getLowStockThreshold();
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    const calculatedStatus = calculateDefaultStatus(item.stocks, threshold);
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
    const threshold = await getLowStockThreshold();
    const { stocks, restocked, ...otherData } = req.body;
    
    // Always calculate status based on threshold
    const finalStatus = calculateDefaultStatus(stocks, threshold);
    
    const newItem = new Inventory({
      ...otherData,
      stocks,
      status: finalStatus,
      restocked: new Date() // Automatically set to current date
    });
    await newItem.save();
    
    const calculatedStatus = calculateDefaultStatus(stocks, threshold);
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
    const threshold = await getLowStockThreshold();
    const { stocks, restocked, ...otherData } = req.body;
    
    // Always calculate status based on threshold
    const finalStatus = calculateDefaultStatus(stocks, threshold);
    
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
    
    const calculatedStatus = calculateDefaultStatus(stocks, threshold);
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

// Settings endpoints: get/set low stock threshold
exports.getLowStockThreshold = async (req, res) => {
  try {
    const threshold = await getLowStockThreshold();
    res.json({ threshold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setLowStockThreshold = async (req, res) => {
  try {
    const { threshold } = req.body;
    const value = parseInt(threshold, 10);
    if (isNaN(value) || value < 1) {
      return res.status(400).json({ error: 'Invalid threshold. Must be a number ≥ 1.' });
    }
    const updated = await Settings.findOneAndUpdate(
      { key: 'lowStockThreshold' },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    // Recalculate and persist statuses for all inventory items based on new threshold
    // 1) Out of stock: stocks <= 0
    await Inventory.updateMany({ stocks: { $lte: 0 } }, { status: 'out of stock' });
    // 2) Low stock: 0 < stocks <= threshold
    await Inventory.updateMany({ stocks: { $gt: 0, $lte: value } }, { status: 'low stock' });
    // 3) In stock: stocks > threshold
    await Inventory.updateMany({ stocks: { $gt: value } }, { status: 'in stock' });

    res.json({ threshold: updated.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
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