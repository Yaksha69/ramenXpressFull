const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  stocks: {
    type: Number,
    required: true
  },
  units: {
    type: String,
    required: true
  },
  restocked: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['in stock', 'low stock', 'out of stock'],
    default: 'in stock'
  }
});

module.exports = mongoose.model('Inventory', inventorySchema); 