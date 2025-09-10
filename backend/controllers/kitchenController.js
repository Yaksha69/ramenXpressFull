const MobileOrder = require('../models/mobileOrder');
const Sales = require('../models/sales');

// Get all kitchen orders (pending + preparing)
exports.getKitchenOrders = async (req, res) => {
    try {
        // Get mobile orders
        const mobileOrders = await MobileOrder.find({
            status: { $in: ['pending', 'preparing'] }
        }).populate('customerId').sort({ createdAt: 1 });

        // Get POS sales with pending/preparing status
        const posOrders = await Sales.find({
            status: { $in: ['pending', 'preparing'] },
            serviceType: { $in: ['dine-in', 'takeout'] }
        }).populate('menuItem').sort({ date: 1 });

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
            ...posOrders.map(sale => ({
                id: sale._id,
                orderId: sale.orderID,
                type: 'pos',
                status: sale.status,
                items: sale.items && sale.items.length > 0 ? sale.items.map(item => ({
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
                })) : [{
                    menuItem: { 
                        name: sale.menuItemName,
                        price: sale.price
                    },
                    quantity: sale.quantity,
                    selectedAddOns: sale.addOns.map(addon => ({
                        name: addon.menuItemName,
                        price: addon.price
                    })),
                    removedIngredients: sale.removedIngredients || []
                }],
                customerName: 'POS Customer',
                orderTime: sale.date,
                serviceType: sale.serviceType
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
            // Emit real-time update
            req.app.get('io').emit('kitchenUpdate', {
                orderId,
                status,
                type: 'mobile'
            });
            
            return res.json({ success: true, order: mobileOrder });
        }

        // Try POS sale
        const posOrder = await Sales.findOneAndUpdate(
            { orderID: orderId },
            { status },
            { new: true }
        );

        if (posOrder) {
            // Emit real-time update
            req.app.get('io').emit('kitchenUpdate', {
                orderId,
                status,
                type: 'pos'
            });
            
            return res.json({ success: true, order: posOrder });
        }

        res.status(404).json({ message: 'Order not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
