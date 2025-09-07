const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    orderID: {
        type: String,
        required: true,
        unique: true
    },
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu',
        required: false
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
    paymentMethod: {
        type: String,
        enum: ['cash', 'paymaya', 'gcash'],
        required: true
    },
    serviceType: {
        type: String,
        enum: ['pickup', 'dine-in'],
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    // Mobile order integration fields
    mobileOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MobileOrder',
        required: false
    },
    mobileOrderReference: {
        type: String,
        required: false
    },
    isFromMobileOrder: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Sales', salesSchema);
