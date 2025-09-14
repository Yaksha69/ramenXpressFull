const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    orderID: {
        type: String,
        required: true
    },
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
    },
    // Kitchen workflow status
    status: {
        type: String,
        enum: ['pending', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    // Array of items for POS orders (multiple items in one order)
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

// Add compound index to ensure orderID + menuItem combination is unique
// This prevents duplicate items in the same order while allowing multiple items per order
salesSchema.index({ orderID: 1, menuItem: 1 }, { unique: true });

// Index for better query performance
salesSchema.index({ orderID: 1 });
salesSchema.index({ paymentMethod: 1 });
salesSchema.index({ paymongoSourceId: 1 });
salesSchema.index({ date: -1 });

module.exports = mongoose.model('Sales', salesSchema);