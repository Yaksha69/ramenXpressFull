const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_order', 'status_update', 'system', 'error', 'success', 'warning', 'info', 'payment', 'kitchen'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: false
  },
  orderType: {
    type: String,
    enum: ['mobile', 'pos', 'kitchen'],
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
    required: false
  },
  customerName: {
    type: String,
    required: false
  },
  totalAmount: {
    type: Number,
    required: false
  },
  paymentMethod: {
    type: String,
    required: false
  },
  // Role-based targeting
  targetRoles: [{
    type: String,
    enum: ['admin', 'cashier', 'kitchen', 'all'],
    default: ['admin', 'cashier']
  }],
  // Specific user targeting (optional)
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userRole: {
      type: String,
      enum: ['admin', 'cashier']
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient role-based queries
notificationSchema.index({ targetRoles: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ orderId: 1 });

// Auto-expire notifications after 7 days
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
