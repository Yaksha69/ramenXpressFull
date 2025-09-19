const MobileOrder = require('../models/mobileOrder');
const POSOrder = require('../models/posOrder');
const Sales = require('../models/sales');
const notificationController = require('./notificationController');

// Get all kitchen orders (pending + preparing)
exports.getKitchenOrders = async (req, res) => {
    try {
        // Get mobile orders
        const mobileOrders = await MobileOrder.find({
            status: { $in: ['accepted', 'preparing'] }
        }).populate('customerId').sort({ createdAt: 1 });

        // Get POS orders with pending/preparing status
        const posOrders = await POSOrder.find({
            status: { $in: ['pending', 'preparing'] }
        }).populate('items.menuItem').sort({ createdAt: 1 });

        // Combine and format for kitchen
        const kitchenOrders = [
            ...mobileOrders.map(order => ({
                id: order._id,
                orderId: order.orderId,
                type: 'mobile',
                status: order.status,
                items: order.items.map(item => ({
                    menuItem: {
                        name: item.menuItem.name,
                        price: item.menuItem.price
                    },
                    quantity: item.quantity,
                    selectedAddOns: item.selectedAddOns || []
                })),
                customerName: order.customerId?.fullName || 'Mobile Customer',
                orderTime: order.createdAt,
                deliveryMethod: order.deliveryMethod,
                notes: order.notes
            })),
            ...posOrders.map(order => ({
                id: order._id,
                orderId: order.orderID,
                type: 'pos',
                status: order.status,
                items: order.items.map(item => ({
                    menuItem: { 
                        name: item.menuItemName,
                        price: item.price
                    },
                    quantity: item.quantity,
                    selectedAddOns: item.addOns.map(addon => ({
                        name: addon.menuItemName,
                        price: addon.price
                    })),
                    removedIngredients: item.removedIngredients || []
                })),
                customerName: 'POS Customer',
                orderTime: order.createdAt,
                serviceType: order.serviceType
            }))
        ];

        res.json(kitchenOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        // Try mobile order first
        const mobileOrder = await MobileOrder.findOneAndUpdate(
            { orderId },
            { status },
            { new: true }
        );

        if (mobileOrder) {
            // Create notification for status update
            try {
                const customerName = mobileOrder.customerId?.firstName || 
                                   mobileOrder.customerId?.name || 
                                   'Customer';
                
                const notification = await notificationController.createStatusUpdateNotification({
                    orderId: mobileOrder.orderId,
                    status: mobileOrder.status,
                    customerName: customerName
                });
                
                // Emit real-time update with notification data
                const io = req.app.get('io');
                if (io) {
                    io.emit('kitchenUpdate', {
                        orderId,
                        status,
                        type: 'mobile',
                        notification: notification
                    });
                    
                    // Also emit general order status update
                    io.emit('orderStatusUpdate', {
                        orderId: mobileOrder._id,
                        status: mobileOrder.status,
                        customerId: mobileOrder.customerId?._id,
                        order: mobileOrder,
                        notification: notification
                    });
                }
            } catch (notificationError) {
                console.error('Failed to create kitchen notification:', notificationError);
                // Still emit the socket event even if notification fails
                const io = req.app.get('io');
                if (io) {
                    io.emit('kitchenUpdate', {
                        orderId,
                        status,
                        type: 'mobile'
                    });
                }
            }
            
            return res.json({ success: true, order: mobileOrder });
        }

        // Try POS order
        const posOrder = await POSOrder.findOneAndUpdate(
            { orderID: orderId },
            { status },
            { new: true }
        );

        if (posOrder) {
            // If order is marked as ready, create sales record
            if (status === 'ready') {
                try {
                    const salesRecord = new Sales({
                        orderID: posOrder.orderID,
                        items: posOrder.items,
                        paymentMethod: posOrder.paymentMethod,
                        serviceType: posOrder.serviceType,
                        totalAmount: posOrder.totalAmount,
                        status: 'ready',
                        // Keep the original fields for backward compatibility
                        menuItem: posOrder.items[0]?.menuItem,
                        menuItemName: posOrder.items[0]?.menuItemName,
                        quantity: posOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                        price: posOrder.items[0]?.price,
                        addOns: posOrder.items[0]?.addOns || [],
                        removedIngredients: posOrder.items[0]?.removedIngredients || []
                    });
                    
                    await salesRecord.save();
                    console.log(`Created sales record for POS order ${posOrder.orderID} when marked as ready`);
                } catch (salesError) {
                    console.error('Failed to create sales record for POS order:', salesError);
                }
            }

            // Create notification for POS order status update
            try {
                const notification = await notificationController.createStatusUpdateNotification({
                    orderId: posOrder.orderID,
                    status: posOrder.status,
                    customerName: 'POS Customer'
                });
                
                // Emit real-time update with notification data
                const io = req.app.get('io');
                if (io) {
                    io.emit('kitchenUpdate', {
                        orderId,
                        status,
                        type: 'pos',
                        notification: notification
                    });
                    
                    // Also emit general order status update
                    io.emit('orderStatusUpdate', {
                        orderId: posOrder._id,
                        status: posOrder.status,
                        order: posOrder,
                        notification: notification
                    });
                }
            } catch (notificationError) {
                console.error('Failed to create POS kitchen notification:', notificationError);
                // Still emit the socket event even if notification fails
                const io = req.app.get('io');
                if (io) {
                    io.emit('kitchenUpdate', {
                        orderId,
                        status,
                        type: 'pos'
                    });
                }
            }
            
            return res.json({ success: true, order: posOrder });
        }

        res.status(404).json({ message: 'Order not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
