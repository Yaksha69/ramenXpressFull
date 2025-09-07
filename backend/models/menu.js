const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['ramen', 'rice bowls', 'side dishes', 'sushi', 'party trays', 'add-ons', 'drinks'],
    required: true
  },
  image: {
    type: String,
    required: true
  },
  ingredients: [
    {
      inventoryItem: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ]
});

module.exports = mongoose.model('Menu', MenuSchema); 