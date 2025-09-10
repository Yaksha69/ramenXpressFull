const MobileOrder = require('../models/mobileOrder');
const Sales = require('../models/sales');
const Menu = require('../models/menu');

// Create a new mobile order
exports.createMobileOrder = async (req, res) => {
  try {
    console.log('📦 Received mobile order request:');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Authenticated customer:', req.customer);
    
    const {
      items,
      deliveryMethod,
      deliveryAddress,
      paymentMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and cannot be empty' });
    }

    if (!deliveryMethod) {
      return res.status(400).json({ message: 'Delivery method is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.menuItem || !item.menuItem.id || !item.menuItem.name || item.menuItem.price === undefined) {
        return res.status(400).json({ 
          message: `Item ${i + 1} is missing required menuItem fields (id, name, price)` 
        });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ 
          message: `Item ${i + 1} has invalid quantity` 
        });
      }
    }

    // Calculate total
    const subtotal = items.reduce((sum, item) => {
      const addOnsPrice = item.selectedAddOns.reduce((addOnSum, addOn) => addOnSum + addOn.price, 0);
      return sum + ((item.menuItem.price + addOnsPrice) * item.quantity);
    }, 0);

    const deliveryFee = deliveryMethod === 'Delivery' ? 50.0 : 0.0;
    const total = subtotal + deliveryFee;

    // Generate order ID and invoice number
    const orderId = generateOrderId();
    const invoiceNumber = generateInvoiceNumber();

    const mobileOrder = new MobileOrder({
      orderId,
      items,
      total,
      deliveryMethod,
      deliveryAddress,
      paymentMethod,
      notes,
      invoiceNumber,
      customerId: req.customer?._id // Add customer ID reference if available
    });

    console.log('💾 Saving mobile order:', JSON.stringify(mobileOrder, null, 2));
    const savedOrder = await mobileOrder.save();

    // Create corresponding sales record for each item
    try {
      for (const item of items) {
        // Generate sales order ID
        const totalSales = await Sales.countDocuments();
        const salesOrderID = (totalSales + 1).toString().padStart(4, '0');

        // Map delivery method to service type
        const serviceType = deliveryMethod === 'Delivery' ? 'pickup' : 'pickup';

        // Calculate total amount for this item
        const itemTotal = (item.menuItem.price * item.quantity) + 
                         item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

        // Create sales record without requiring menu item lookup
        const salesRecord = new Sales({
          orderID: salesOrderID,
          menuItem: null, // Set to null since we don't have valid ObjectId
          quantity: item.quantity,
          price: item.menuItem.price,
          addOns: [], // Skip add-ons for now to avoid ObjectId issues
          paymentMethod: paymentMethod.toLowerCase(),
          serviceType: serviceType,
          totalAmount: itemTotal,
          mobileOrderId: savedOrder._id,
          mobileOrderReference: savedOrder.orderId,
          isFromMobileOrder: true
        });

        await salesRecord.save();
        console.log('💰 Created sales record for mobile order item:', salesOrderID);
      }
    } catch (salesError) {
      console.error('⚠️ Warning: Failed to create sales record:', salesError);
      // Don't fail the mobile order creation if sales creation fails
    }

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('❌ Error creating mobile order:', err);
    res.status(400).json({ message: err.message });
  }
};

// Get all mobile orders
exports.getAllMobileOrders = async (req, res) => {
  try {
    const orders = await MobileOrder.find().populate('customerId');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get customer's own orders
exports.getCustomerOrders = async (req, res) => {
  try {
    console.log('👤 Customer requesting orders:', req.customer._id);
    
    const orders = await MobileOrder.find({ 
      customerId: req.customer._id 
    }).sort({ createdAt: -1 });
    
    console.log(`📦 Found ${orders.length} orders for customer`);
    res.json(orders);
  } catch (err) {
    console.error('❌ Error fetching customer orders:', err);
    res.status(500).json({ message: err.message });
  }
};

// Update a mobile order by ID
exports.updateMobileOrder = async (req, res) => {
  try {
    const order = await MobileOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // use 'status' as the field
    const updatedOrder = await MobileOrder.findByIdAndUpdate(
      orderId,
      { status }, // update the 'status' field
      { new: true }
    ).populate('customerId', 'firstName lastName name fullName phone');
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Emit socket.io event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('orderStatusUpdate', {
        orderId: updatedOrder._id,
        status: updatedOrder.status,
        customerId: updatedOrder.customerId?._id,
        order: updatedOrder
      });
    }
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get mobile order by ID
exports.getMobileOrderById = async (req, res) => {
  try {
    const order = await MobileOrder.findById(req.params.id).populate('customerId', 'firstName lastName name fullName phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Return the order wrapped in a data object for consistency
    res.json({ data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel a mobile order
exports.cancelMobileOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the order
    const order = await MobileOrder.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if order can be cancelled (only pending orders can be cancelled)
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled. Only pending orders can be cancelled.' 
      });
    }
    
    // Update order status to cancelled
    const updatedOrder = await MobileOrder.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    ).populate('customerId', 'firstName lastName name fullName phone');
    
    // Emit socket.io event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('orderStatusUpdate', {
        orderId: updatedOrder._id,
        status: updatedOrder.status,
        customerId: updatedOrder.customerId?._id,
        order: updatedOrder
      });
    }
    
    console.log(`🚫 Order ${order.orderId} has been cancelled`);
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully',
      order: updatedOrder 
    });
  } catch (err) {
    console.error('❌ Error cancelling order:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper functions
function generateOrderId() {
  const random = Math.floor(Math.random() * 10000);
  return random.toString().padStart(4, '0');
}

function generateInvoiceNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `INV${timestamp}${random.toString().padStart(4, '0')}`;
}

// Utility function to sync mobile orders to sales (for existing orders)
exports.syncMobileOrdersToSales = async (req, res) => {
  try {
    console.log('🔄 Starting mobile orders to sales sync...');
    
    const mobileOrders = await MobileOrder.find({});
    let syncedCount = 0;
    let errorCount = 0;

    for (const mobileOrder of mobileOrders) {
      try {
        for (const item of mobileOrder.items) {
          // Check if sales record already exists for this mobile order
          const existingSales = await Sales.findOne({ 
            mobileOrderId: mobileOrder._id,
            mobileOrderReference: mobileOrder.orderId
          });

          if (!existingSales) {
            // Generate sales order ID
            const totalSales = await Sales.countDocuments();
            const salesOrderID = (totalSales + 1).toString().padStart(4, '0');

            // Map delivery method to service type
            const serviceType = mobileOrder.deliveryMethod === 'Delivery' ? 'pickup' : 'pickup';

            // Calculate total amount for this item
            const itemTotal = (item.menuItem.price * item.quantity) + 
                             item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

            // Create sales record without requiring menu item lookup
            const salesRecord = new Sales({
              orderID: salesOrderID,
              menuItem: null, // Set to null since we don't have valid ObjectId
              quantity: item.quantity,
              price: item.menuItem.price,
              addOns: [], // Skip add-ons for now to avoid ObjectId issues
              paymentMethod: mobileOrder.paymentMethod.toLowerCase(),
              serviceType: serviceType,
              totalAmount: itemTotal,
              mobileOrderId: mobileOrder._id, // Reference to mobile order
              mobileOrderReference: mobileOrder.orderId,
              isFromMobileOrder: true
            });

            await salesRecord.save();
            syncedCount++;
            console.log(`💰 Synced mobile order ${mobileOrder.orderId} item to sales record ${salesOrderID}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing mobile order ${mobileOrder.orderId}:`, error);
        errorCount++;
      }
    }

    res.json({
      message: 'Mobile orders sync completed',
      syncedCount,
      errorCount,
      totalProcessed: mobileOrders.length
    });
  } catch (error) {
    console.error('❌ Error in mobile orders sync:', error);
    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
};
