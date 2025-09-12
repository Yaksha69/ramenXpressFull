const Notification = require('../models/notification');

// Get notifications for current user's role
exports.getNotificationsForUser = async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    const userRole = req.user.role;
    
    let query = {
      $or: [
        { targetRoles: 'all' },
        { targetRoles: userRole }
      ]
    };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      userRole
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all notifications (admin only)
exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read by specific user
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { 
        $set: { isRead: true },
        $push: { 
          readBy: { 
            userId: userId, 
            userRole: userRole,
            readAt: new Date() 
          } 
        }
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read for current user's role
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    await Notification.updateMany(
      { 
        $or: [
          { targetRoles: 'all' },
          { targetRoles: userRole }
        ],
        isRead: false 
      },
      { 
        $set: { isRead: true },
        $push: { 
          readBy: { 
            userId: userId, 
            userRole: userRole,
            readAt: new Date() 
          } 
        }
      }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unread count for user's role
exports.getUnreadCount = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    const count = await Notification.countDocuments({
      $or: [
        { targetRoles: 'all' },
        { targetRoles: userRole }
      ],
      isRead: false
    });
    
    res.json({ count, userRole });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create notification (internal function)
exports.createNotification = async (notificationData) => {
  try {
    const notification = new Notification({
      ...notificationData,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    const savedNotification = await notification.save();
    return savedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper functions for creating specific notification types

// Create new order notification (both admin & cashier)
exports.createNewOrderNotification = async (orderData) => {
  try {
    console.log('Creating new order notification with data:', orderData);
    
    const notification = new Notification({
      type: 'new_order',
      title: `🛍️ New Mobile Order #${orderData.orderId}`,
      message: `${orderData.customerName} - ₱${orderData.total.toFixed(2)}`,
      orderId: orderData.orderId,
      orderType: 'mobile',
      status: 'pending',
      customerName: orderData.customerName,
      totalAmount: orderData.total,
      paymentMethod: orderData.paymentMethod,
      targetRoles: ['admin', 'cashier'],
      priority: 'high',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    console.log('Notification object created:', notification);
    const savedNotification = await notification.save();
    console.log('Notification saved successfully:', savedNotification);
    
    return savedNotification;
  } catch (error) {
    console.error('Error creating new order notification:', error);
    return null;
  }
};

// Create status update notification (both admin & cashier)
exports.createStatusUpdateNotification = async (orderData) => {
  try {
    const notification = new Notification({
      type: 'status_update',
      title: `📋 Order #${orderData.orderId} Status Updated`,
      message: `Status changed to: ${orderData.status}`,
      orderId: orderData.orderId,
      orderType: 'mobile',
      status: orderData.status,
      customerName: orderData.customerName,
      targetRoles: ['admin', 'cashier'],
      priority: orderData.status === 'ready' ? 'high' : 'medium',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return await notification.save();
  } catch (error) {
    console.error('Error creating status update notification:', error);
    return null;
  }
};

// Create payment issue notification (admin only)
exports.createPaymentIssueNotification = async (orderData) => {
  try {
    const notification = new Notification({
      type: 'payment',
      title: `💳 Payment Issue - Order #${orderData.orderId}`,
      message: `Payment failed for ${orderData.customerName}`,
      orderId: orderData.orderId,
      targetRoles: ['admin'],
      priority: 'urgent',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return await notification.save();
  } catch (error) {
    console.error('Error creating payment issue notification:', error);
    return null;
  }
};

// Create kitchen ready notification (cashier only)
exports.createKitchenReadyNotification = async (orderData) => {
  try {
    const notification = new Notification({
      type: 'kitchen',
      title: `🍽️ Order Ready - #${orderData.orderId}`,
      message: `Order is ready for ${orderData.deliveryMethod}`,
      orderId: orderData.orderId,
      targetRoles: ['cashier'],
      priority: 'high',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return await notification.save();
  } catch (error) {
    console.error('Error creating kitchen ready notification:', error);
    return null;
  }
};
