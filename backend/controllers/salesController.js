const Sales = require('../models/sales');
const POSOrder = require('../models/posOrder');
const Menu = require('../models/menu');
const Inventory = require('../models/inventory');
const Counter = require('../models/counter');
const Settings = require('../models/settings');
const notificationController = require('./notificationController');

// Get low stock threshold from settings
const getLowStockThreshold = async () => {
    try {
        const settings = await Settings.findOne({ key: 'lowStockThreshold' });
        return settings ? settings.value : 10; // Default threshold
    } catch (error) {
        console.error('Error getting low stock threshold:', error);
        return 10; // Default threshold
    }
};

// Generate simple sequential order ID - always check database for highest existing ID
const generateOrderID = async () => {
    try {
        // Always get the highest existing order ID from the database
        const lastSale = await Sales.findOne({}, {}, { sort: { 'orderID': -1 } });
        let nextNumber = 1;
        
        if (lastSale && lastSale.orderID) {
            nextNumber = parseInt(lastSale.orderID, 10) + 1;
            console.log(`Found highest order ID: ${lastSale.orderID}, next will be: ${nextNumber}`);
        } else {
            console.log('No existing sales found, starting with: 1');
        }
        
        // Format as 4-digit number with leading zeros
        let orderID = nextNumber.toString().padStart(4, '0');
        
        // Check if this order ID already exists (safety check)
        let attempts = 0;
        while (attempts < 10) { // Max 10 attempts to avoid infinite loop
            const existingSale = await Sales.findOne({ orderID: orderID });
            if (!existingSale) {
                console.log(`Generated unique order ID: ${orderID}`);
                return orderID;
            }
            
            // If order ID exists, increment and try again
            nextNumber++;
            orderID = nextNumber.toString().padStart(4, '0');
            attempts++;
            console.log(`Order ID ${orderID} already exists, trying ${nextNumber}`);
        }
        
        // If we've tried 10 times and still have conflicts, use timestamp
        const fallbackID = Date.now().toString().slice(-4);
        console.log(`Too many conflicts, using fallback order ID: ${fallbackID}`);
        return fallbackID;
        
    } catch (error) {
        console.error('Error generating order ID:', error);
        // Fallback: use timestamp
        const fallbackID = Date.now().toString().slice(-4);
        console.log(`Using fallback order ID: ${fallbackID}`);
        return fallbackID;
    }
};

// Reset counter to sync with existing sales (utility function)
const resetCounter = async () => {
    try {
        const lastSale = await Sales.findOne({}, {}, { sort: { 'orderID': -1 } });
        let newValue = 0;
        
        if (lastSale && lastSale.orderID) {
            newValue = parseInt(lastSale.orderID, 10);
        }
        
        await Counter.findByIdAndUpdate(
            'orderID',
            { sequence_value: newValue },
            { upsert: true }
        );
        
        console.log(`Counter reset to: ${newValue}`);
        return newValue;
    } catch (error) {
        console.error('Error resetting counter:', error);
        throw error;
    }
};

// Deduct ingredients from inventory
const deductIngredients = async (menuItem, quantity, addOns, removedIngredients = [], req = null) => {
    try {
        // Get low stock threshold
        const threshold = await getLowStockThreshold();
        const lowStockNotifications = [];
        
        // Create a map of removed ingredients for quick lookup
        const removedMap = {};
        removedIngredients.forEach(removed => {
            removedMap[removed.inventoryItem] = removed.quantity;
        });

        // Deduct ingredients for main menu item (excluding removed ones)
        for (const ingredient of menuItem.ingredients) {
            const inventoryItem = await Inventory.findOne({ name: ingredient.inventoryItem });
            if (inventoryItem) {
                // Calculate quantity to deduct (original - removed)
                const removedQuantity = removedMap[ingredient.inventoryItem] || 0;
                const actualQuantity = Math.max(0, ingredient.quantity - removedQuantity);
                const requiredQuantity = actualQuantity * quantity;
                
                if (requiredQuantity > 0) {
                    if (inventoryItem.stocks >= requiredQuantity) {
                        const oldStocks = inventoryItem.stocks;
                        inventoryItem.stocks -= requiredQuantity;
                        await inventoryItem.save();
                        console.log(`Deducted ${requiredQuantity} ${ingredient.inventoryItem} (${ingredient.quantity} - ${removedQuantity} removed) × ${quantity}`);
                        
                        // Check if this deduction caused low stock or out of stock
                        if (inventoryItem.stocks <= 0) {
                            lowStockNotifications.push({
                                item: inventoryItem,
                                type: 'out_of_stock',
                                oldStocks: oldStocks,
                                newStocks: inventoryItem.stocks
                            });
                        } else if (inventoryItem.stocks <= threshold) {
                            lowStockNotifications.push({
                                item: inventoryItem,
                                type: 'low_stock',
                                oldStocks: oldStocks,
                                newStocks: inventoryItem.stocks
                            });
                        }
                    } else {
                        throw new Error(`Insufficient stock for ${ingredient.inventoryItem}. Available: ${inventoryItem.stocks}, Required: ${requiredQuantity}`);
                    }
                } else {
                    console.log(`Skipped ${ingredient.inventoryItem} - fully removed by customer`);
                }
            } else {
                throw new Error(`Inventory item ${ingredient.inventoryItem} not found`);
            }
        }

        // Deduct ingredients for add-ons
        for (const addOn of addOns) {
            const addOnMenuItem = await Menu.findById(addOn.menuItem);
            if (addOnMenuItem && addOnMenuItem.category === 'add-ons') {
                for (const ingredient of addOnMenuItem.ingredients) {
                    const inventoryItem = await Inventory.findOne({ name: ingredient.inventoryItem });
                    if (inventoryItem) {
                        const requiredQuantity = ingredient.quantity * addOn.quantity;
                        if (inventoryItem.stocks >= requiredQuantity) {
                            const oldStocks = inventoryItem.stocks;
                            inventoryItem.stocks -= requiredQuantity;
                            await inventoryItem.save();
                            
                            // Check if this deduction caused low stock or out of stock
                            if (inventoryItem.stocks <= 0) {
                                lowStockNotifications.push({
                                    item: inventoryItem,
                                    type: 'out_of_stock',
                                    oldStocks: oldStocks,
                                    newStocks: inventoryItem.stocks
                                });
                            } else if (inventoryItem.stocks <= threshold) {
                                lowStockNotifications.push({
                                    item: inventoryItem,
                                    type: 'low_stock',
                                    oldStocks: oldStocks,
                                    newStocks: inventoryItem.stocks
                                });
                            }
                        } else {
                            throw new Error(`Insufficient stock for ${ingredient.inventoryItem}. Available: ${inventoryItem.stocks}, Required: ${requiredQuantity}`);
                        }
                    } else {
                        throw new Error(`Inventory item ${ingredient.inventoryItem} not found`);
                    }
                }
            }
        }
        
        // Create notifications for low stock items
        if (lowStockNotifications.length > 0 && req) {
            try {
                for (const notification of lowStockNotifications) {
                    let notificationData = null;
                    
                    if (notification.type === 'out_of_stock') {
                        notificationData = await notificationController.createNotification({
                            type: 'warning',
                            title: `⚠️ Out of Stock Alert`,
                            message: `${notification.item.name} is now out of stock after order processing`,
                            targetRoles: ['admin', 'cashier'],
                            priority: 'high'
                        });
                    } else if (notification.type === 'low_stock') {
                        notificationData = await notificationController.createNotification({
                            type: 'warning',
                            title: `📉 Low Stock Alert`,
                            message: `${notification.item.name} is running low (${notification.newStocks} remaining) after order processing`,
                            targetRoles: ['admin', 'cashier'],
                            priority: 'medium'
                        });
                    }
                    
                    // Emit real-time notification
                    if (notificationData) {
                        const io = req.app.get('io');
                        if (io) {
                            io.emit('inventoryUpdate', {
                                itemId: notification.item._id,
                                itemName: notification.item.name,
                                stocks: notification.newStocks,
                                status: notification.type === 'out_of_stock' ? 'out of stock' : 'low stock',
                                notification: notificationData
                            });
                        }
                    }
                }
            } catch (notificationError) {
                console.error('Failed to create low stock notifications:', notificationError);
                // Don't fail the order if notification creation fails
            }
        }
        
    } catch (error) {
        throw error;
    }
};

// Create a new sale
exports.createSale = async (req, res) => {
    try {
        const { menuItem, quantity, addOns, removedIngredients, paymentMethod, serviceType, orderID } = req.body;
        
        // Validate required fields
        if (!menuItem) {
            return res.status(400).json({ message: 'Menu item is required' });
        }
        
        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Valid quantity is required (minimum 1)' });
        }
        
        if (!paymentMethod || !['cash', 'paymaya', 'gcash'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Valid payment method is required (cash, paymaya, gcash)' });
        }
        
        if (!serviceType || !['dine-in', 'takeout'].includes(serviceType)) {
            return res.status(400).json({ message: 'Valid service type is required (dine-in, takeout)' });
        }
        
        // Validate main menu item exists
        console.log('Looking for menu item with ID:', menuItem);
        console.log('Menu item ID type:', typeof menuItem);
        console.log('Menu item ID length:', menuItem ? menuItem.length : 'null');
        
        // Check if menuItem is a valid ObjectId
        if (!menuItem || typeof menuItem !== 'string' || menuItem.length !== 24) {
            return res.status(400).json({ message: `Invalid menu item ID format: ${menuItem}` });
        }
        
        const menuItemDoc = await Menu.findById(menuItem);
        console.log('Found menu item:', menuItemDoc ? 'Yes' : 'No');
        if (!menuItemDoc) {
            return res.status(400).json({ message: `Menu item with ID ${menuItem} not found` });
        }
        
        // Process add-ons if any
        const processedAddOns = [];
        if (addOns && Array.isArray(addOns)) {
            console.log('Processing add-ons:', addOns);
            for (const addOn of addOns) {
                // Validate add-on menu item exists and is categorized as add-ons
                console.log('Looking for add-on with ID:', addOn.menuItem);
                console.log('Add-on ID type:', typeof addOn.menuItem);
                console.log('Add-on ID length:', addOn.menuItem ? addOn.menuItem.length : 'null');
                
                // Check if addOn.menuItem is a valid ObjectId
                if (!addOn.menuItem || typeof addOn.menuItem !== 'string' || addOn.menuItem.length !== 24) {
                    return res.status(400).json({ message: `Invalid add-on menu item ID format: ${addOn.menuItem}` });
                }
                
                const addOnMenuItem = await Menu.findById(addOn.menuItem);
                console.log('Found add-on menu item:', addOnMenuItem ? 'Yes' : 'No');
                if (!addOnMenuItem) {
                    return res.status(400).json({ message: `Add-on menu item with ID ${addOn.menuItem} not found` });
                }
                
                if (addOnMenuItem.category !== 'add-ons') {
                    return res.status(400).json({ message: `Menu item ${addOnMenuItem.name} is not an add-on` });
                }
                
                const addOnQuantity = addOn.quantity || 1;
                processedAddOns.push({
                    menuItem: addOn.menuItem,
                    menuItemName: addOnMenuItem.name, // Save add-on name for fallback
                    quantity: addOnQuantity,
                    price: addOnMenuItem.price
                });
            }
        }

        // Process removed ingredients if any
        const processedRemovedIngredients = [];
        if (removedIngredients && Array.isArray(removedIngredients)) {
            for (const removed of removedIngredients) {
                // Check if the ingredient exists in the menu item
                const menuIngredient = menuItemDoc.ingredients.find(ing => ing.inventoryItem === removed.inventoryItem);
                
                if (menuIngredient) {
                    // If ingredient is in menu item, validate quantity
                    if (removed.quantity > menuIngredient.quantity) {
                        return res.status(400).json({ message: `Cannot remove more ${removed.inventoryItem} than what's in the menu item` });
                    }
                } else {
                    // If ingredient is not in menu item, allow removal but set quantity to 0
                    // This handles common ingredients that customers might want to remove
                    console.log(`Ingredient ${removed.inventoryItem} not in menu item, allowing removal with quantity 0`);
                }
                
                processedRemovedIngredients.push({
                    inventoryItem: removed.inventoryItem,
                    name: removed.name,
                    quantity: menuIngredient ? removed.quantity : 0
                });
            }
        }
        
        // Deduct ingredients from inventory (accounting for removed ingredients)
        await deductIngredients(menuItemDoc, quantity, processedAddOns, processedRemovedIngredients, req);
        
        // Generate order ID if not provided (for single items or mobile orders)
        const finalOrderID = orderID || await generateOrderID();
        
        // Calculate total amount
        let totalAmount = menuItemDoc.price * quantity;
        
        // Add add-ons to total
        for (const addOn of processedAddOns) {
            totalAmount += addOn.price * addOn.quantity;
        }
        
        const sale = new Sales({
            orderID: finalOrderID,
            menuItem,
            menuItemName: menuItemDoc.name, // Save menu item name for fallback
            quantity,
            price: menuItemDoc.price,
            addOns: processedAddOns,
            removedIngredients: processedRemovedIngredients,
            paymentMethod,
            serviceType,
            totalAmount,
            status: 'pending' // Start as pending for kitchen
        });
        
        await sale.save();
        
        // Emit real-time update to kitchen (only for new orders, not when orderID is provided)
        if (!orderID) {
            req.app.get('io').emit('newOrder', {
                orderId: sale.orderID,
                type: 'pos',
                status: 'pending',
                items: [{
                    menuItem: { name: sale.menuItemName },
                    quantity: sale.quantity,
                    selectedAddOns: sale.addOns.map(addon => ({
                        name: addon.menuItemName,
                        price: addon.price
                    }))
                }]
            });
        }
        
        res.status(201).json(sale);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Create multiple sales with a single order ID (for POS orders) - Single Document Approach
exports.createMultipleSales = async (req, res) => {
    try {
        const { items, paymentMethod, serviceType } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items array is required and cannot be empty' });
        }
        
        if (!paymentMethod || !serviceType) {
            return res.status(400).json({ message: 'Payment method and service type are required' });
        }
        
        // Debug: Show current order IDs in database
        const allSales = await Sales.find({}, { orderID: 1 }).sort({ orderID: 1 });
        console.log('Current order IDs in database:', allSales.map(s => s.orderID));
        
        // Generate a single order ID for all items
        const orderID = await generateOrderID();
        console.log(`Generated order ID: ${orderID} for ${items.length} items`);
        
        // Double-check that this order ID doesn't already exist
        const existingOrder = await Sales.findOne({ orderID: orderID });
        if (existingOrder) {
            console.error(`CRITICAL: Generated order ID ${orderID} already exists in database!`);
            return res.status(500).json({ 
                message: 'Order ID conflict detected', 
                orderID: orderID,
                existingOrder: existingOrder._id
            });
        }
        
        const processedItems = [];
        const errors = [];
        let totalOrderAmount = 0;
        
        // Process each item to validate and prepare data
        for (let i = 0; i < items.length; i++) {
            try {
                const item = items[i];
                const { menuItem, quantity, addOns, removedIngredients } = item;
                
                console.log(`Processing item ${i + 1}/${items.length} for order ${orderID}`);
                
                // Validate menu item
                if (!menuItem || typeof menuItem !== 'string' || menuItem.length !== 24) {
                    throw new Error(`Invalid menu item ID format: ${menuItem}`);
                }
                
                const menuItemDoc = await Menu.findById(menuItem);
                if (!menuItemDoc) {
                    throw new Error(`Menu item with ID ${menuItem} not found`);
                }
                
                // Process add-ons
                const processedAddOns = [];
                if (addOns && Array.isArray(addOns)) {
                    for (const addOn of addOns) {
                        if (!addOn.menuItem || typeof addOn.menuItem !== 'string' || addOn.menuItem.length !== 24) {
                            throw new Error(`Invalid add-on menu item ID format: ${addOn.menuItem}`);
                        }
                        
                        const addOnMenuItem = await Menu.findById(addOn.menuItem);
                        if (!addOnMenuItem) {
                            throw new Error(`Add-on menu item with ID ${addOn.menuItem} not found`);
                        }
                        
                        if (addOnMenuItem.category !== 'add-ons') {
                            throw new Error(`Menu item ${addOnMenuItem.name} is not an add-on`);
                        }
                        
                        const addOnQuantity = addOn.quantity || 1;
                        processedAddOns.push({
                            menuItem: addOn.menuItem,
                            menuItemName: addOnMenuItem.name,
                            quantity: addOnQuantity,
                            price: addOnMenuItem.price
                        });
                    }
                }
                
                // Process removed ingredients
                const processedRemovedIngredients = [];
                if (removedIngredients && Array.isArray(removedIngredients)) {
                    for (const removed of removedIngredients) {
                        const menuIngredient = menuItemDoc.ingredients.find(ing => ing.inventoryItem === removed.inventoryItem);
                        
                        if (menuIngredient) {
                            if (removed.quantity > menuIngredient.quantity) {
                                throw new Error(`Cannot remove more ${removed.inventoryItem} than what's in the menu item`);
                            }
                        }
                        
                        processedRemovedIngredients.push({
                            inventoryItem: removed.inventoryItem,
                            name: removed.name,
                            quantity: menuIngredient ? removed.quantity : 0
                        });
                    }
                }
                
                // Deduct ingredients from inventory
                await deductIngredients(menuItemDoc, quantity, processedAddOns, processedRemovedIngredients, req);
                
                // Calculate item total amount
                let itemTotalAmount = menuItemDoc.price * quantity;
                for (const addOn of processedAddOns) {
                    itemTotalAmount += addOn.price * addOn.quantity;
                }
                totalOrderAmount += itemTotalAmount;
                
                // Add to processed items
                processedItems.push({
                    menuItem: menuItem,
                    menuItemName: menuItemDoc.name,
                    quantity: quantity,
                    price: menuItemDoc.price,
                    addOns: processedAddOns,
                    removedIngredients: processedRemovedIngredients,
                    itemTotalAmount: itemTotalAmount
                });
                
            } catch (itemError) {
                errors.push({
                    itemIndex: i,
                    error: itemError.message
                });
            }
        }
        
        // If there were errors, return them
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Some items failed to process',
                errors,
                successfulItems: processedItems.length
            });
        }
        
        // Create a POS order document (not sales record yet)
        const posOrder = new POSOrder({
            orderID,
            items: processedItems, // Store all items in a single document
            paymentMethod,
            serviceType,
            totalAmount: totalOrderAmount,
            status: 'pending'
        });
        
        await posOrder.save();
        console.log(`Created POS order with ${processedItems.length} items for order ${orderID}`);
        
        // Emit real-time update to kitchen
        req.app.get('io').emit('newOrder', {
            orderId: orderID,
            type: 'pos',
            status: 'pending',
            items: processedItems.map(item => ({
                menuItem: { name: item.menuItemName },
                quantity: item.quantity,
                selectedAddOns: item.addOns.map(addon => ({
                    name: addon.menuItemName,
                    price: addon.price
                }))
            }))
        });
        
        res.status(201).json({
            orderID,
            posOrder,
            totalItems: processedItems.length,
            totalAmount: totalOrderAmount,
            message: `Successfully created order ${orderID} with ${processedItems.length} items`
        });
        
    } catch (err) {
        console.error('Error in createMultipleSales:', err);
        res.status(500).json({ message: err.message });
    }
};

// Reset counter endpoint (for debugging/admin use)
exports.resetCounter = async (req, res) => {
    try {
        const newValue = await resetCounter();
        res.json({
            message: 'Counter reset successfully',
            newValue: newValue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all sales
exports.getAllSales = async (req, res) => {
    try {
        const sales = await Sales.find().populate('menuItem').populate('addOns.menuItem');
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all sales with total orders count
exports.getSalesSummary = async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        
        let dateFilter = {};
        
        // Apply date filter based on period
        if (period === 'week') {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0);
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)
            endOfWeek.setHours(23, 59, 59, 999);
            
            dateFilter = {
                date: {
                    $gte: startOfWeek,
                    $lte: endOfWeek
                }
            };
        } else if (period === 'month') {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            
            dateFilter = {
                date: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            };
        } else if (period === 'today') {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            
            dateFilter = {
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            };
        }
        
        const sales = await Sales.find(dateFilter).populate('menuItem').populate('addOns.menuItem');
        const totalOrders = sales.length;
        
        res.json({
            sales,
            totalOrders,
            period,
            summary: {
                totalOrders,
                message: `Total of ${totalOrders} orders found for ${period}`,
                dateRange: dateFilter.date ? {
                    from: dateFilter.date.$gte,
                    to: dateFilter.date.$lte
                } : null
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a sale by ID
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sales.findById(req.params.id).populate('menuItem').populate('addOns.menuItem');
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a sale by orderID
exports.getSaleByOrderID = async (req, res) => {
    try {
        const sale = await Sales.findOne({ orderID: req.params.orderID }).populate('menuItem').populate('addOns.menuItem');
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update a sale by ID
exports.updateSale = async (req, res) => {
    try {
        const sale = await Sales.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('menuItem').populate('addOns.menuItem');
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json(sale);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete a sale by ID
exports.deleteSale = async (req, res) => {
    try {
        const sale = await Sales.findByIdAndDelete(req.params.id);
        if (!sale) return res.status(404).json({ message: 'Sale not found' });
        res.json({ message: 'Sale deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Aggregate product sales (main items and add-ons)
// Query params:
// - startDate, endDate (ISO date strings)
// - limit (number of top products)
exports.getProductSales = async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.query;

        const matchStage = {};
        if (startDate || endDate) {
            matchStage.date = {};
            if (startDate) matchStage.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                // Include the entire end day
                end.setHours(23, 59, 59, 999);
                matchStage.date.$lte = end;
            }
        }

        const pipeline = [
            Object.keys(matchStage).length ? { $match: matchStage } : null,
            // Lookup main menu item doc for fallback name
            {
                $lookup: {
                    from: 'menus',
                    localField: 'menuItem',
                    foreignField: '_id',
                    as: 'menuDoc'
                }
            },
            // Collect add-on menu ids and fetch their docs
            {
                $addFields: {
                    addOnMenuIds: {
                        $map: {
                            input: { $ifNull: [ '$addOns', [] ] },
                            as: 'ao',
                            in: '$$ao.menuItem'
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'menus',
                    let: { ids: '$addOnMenuIds' },
                    pipeline: [
                        { $match: { $expr: { $in: [ '$_id', '$$ids' ] } } },
                        { $project: { _id: 1, name: 1 } }
                    ],
                    as: 'addOnMenuDocs'
                }
            },
            {
                $project: {
                    items: {
                        $concatArrays: [
                            [
                                {
                                    name: {
                                        $ifNull: [
                                            '$menuItemName',
                                            { $arrayElemAt: [ '$menuDoc.name', 0 ] }
                                        ]
                                    },
                                    quantity: '$quantity',
                                    price: '$price'
                                }
                            ],
                            {
                                $map: {
                                    input: { $ifNull: [ '$addOns', [] ] },
                                    as: 'ao',
                                    in: {
                                        name: {
                                            $ifNull: [
                                                '$$ao.menuItemName',
                                                {
                                                    $let: {
                                                        vars: {
                                                            idx: { $indexOfArray: [ '$addOnMenuDocs._id', '$$ao.menuItem' ] }
                                                        },
                                                        in: {
                                                            $cond: [
                                                                { $gte: [ '$$idx', 0 ] },
                                                                { $arrayElemAt: [ '$addOnMenuDocs.name', '$$idx' ] },
                                                                'Unknown Add-on'
                                                            ]
                                                        }
                                                    }
                                                }
                                            ]
                                        },
                                        quantity: { $ifNull: [ '$$ao.quantity', 1 ] },
                                        price: { $ifNull: [ '$$ao.price', 0 ] }
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: { $toLower: '$items.name' },
                    name: { $first: '$items.name' },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalQuantity: -1 } },
        ].filter(Boolean);

        if (limit && !isNaN(Number(limit))) {
            pipeline.push({ $limit: Number(limit) });
        }

        const results = await Sales.aggregate(pipeline);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
