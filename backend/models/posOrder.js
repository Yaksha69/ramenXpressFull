const mongoose = require('mongoose');

const posOrderSchema = new mongoose.Schema({
  orderID: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },
    menuItemName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    addOns: [{
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu',
        required: false
      },
      menuItemName: {
        type: String,
        required: false
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
      },
      price: {
        type: Number,
        required: true
      }
    }],
    removedIngredients: [{
      inventoryItem: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    itemTotalAmount: {
      type: Number,
      required: true
    }
  }],
  paymentMethod: {
    type: String,
    enum: ['cash', 'paymaya', 'gcash', 'gcash_qr', 'paymaya_qr'],
    required: true
  },
  serviceType: {
    type: String,
    enum: ['dine-in', 'takeout'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'cancelled'],
    default: 'pending'
  },
  // PayMongo QR payment fields
  paymongoSourceId: {
    type: String,
    required: false
  },
  paymongoStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    required: false
  },
  qrCodeGenerated: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('POSOrder', posOrderSchema);
