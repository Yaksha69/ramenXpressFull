const Sales = require('../models/sales');
const Menu = require('../models/menu');
const Inventory = require('../models/inventory');

// Generate simple sequential order ID
const generateOrderID = async () => {
    // Get the total count of sales to create the next sequential number
    const totalSales = await Sales.countDocuments();
    const nextNumber = totalSales + 1;
    
    // Format as 4-digit number with leading zeros
    return nextNumber.toString().padStart(4, '0');
};

// Deduct ingredients from inventory
const deductIngredients = async (menuItem, quantity, addOns, removedIngredients = []) => {
    try {
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
                        inventoryItem.stocks -= requiredQuantity;
                        await inventoryItem.save();
                        console.log(`Deducted ${requiredQuantity} ${ingredient.inventoryItem} (${ingredient.quantity} - ${removedQuantity} removed) × ${quantity}`);
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
                            inventoryItem.stocks -= requiredQuantity;
                            await inventoryItem.save();
                        } else {
                            throw new Error(`Insufficient stock for ${ingredient.inventoryItem}. Available: ${inventoryItem.stocks}, Required: ${requiredQuantity}`);
                        }
                    } else {
                        throw new Error(`Inventory item ${ingredient.inventoryItem} not found`);
                    }
                }
            }
        }
    } catch (error) {
        throw error;
    }
};

// Create a new sale
exports.createSale = async (req, res) => {
    try {
        const { menuItem, quantity, addOns, removedIngredients, paymentMethod, serviceType } = req.body;
        
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
        
        if (!serviceType || !['pickup', 'dine-in', 'takeout'].includes(serviceType)) {
            return res.status(400).json({ message: 'Valid service type is required (pickup, dine-in, takeout)' });
        }
        
        // Validate main menu item exists
        const menuItemDoc = await Menu.findById(menuItem);
        if (!menuItemDoc) {
            return res.status(400).json({ message: `Menu item with ID ${menuItem} not found` });
        }
        
        // Process add-ons if any
        const processedAddOns = [];
        if (addOns && Array.isArray(addOns)) {
            for (const addOn of addOns) {
                // Validate add-on menu item exists and is categorized as add-ons
                const addOnMenuItem = await Menu.findById(addOn.menuItem);
                if (!addOnMenuItem) {
                    return res.status(400).json({ message: `Add-on menu item with ID ${addOn.menuItem} not found` });
                }
                
                if (addOnMenuItem.category !== 'add-ons') {
                    return res.status(400).json({ message: `Menu item ${addOnMenuItem.name} is not an add-on` });
                }
                
                const addOnQuantity = addOn.quantity || 1;
                processedAddOns.push({
                    menuItem: addOn.menuItem,
                    quantity: addOnQuantity,
                    price: addOnMenuItem.price
                });
            }
        }

        // Process removed ingredients if any
        const processedRemovedIngredients = [];
        if (removedIngredients && Array.isArray(removedIngredients)) {
            for (const removed of removedIngredients) {
                // Validate that the ingredient exists in the menu item
                const menuIngredient = menuItemDoc.ingredients.find(ing => ing.inventoryItem === removed.inventoryItem);
                if (!menuIngredient) {
                    return res.status(400).json({ message: `Ingredient ${removed.inventoryItem} is not part of this menu item` });
                }
                
                // Validate removed quantity doesn't exceed what's in the menu item
                if (removed.quantity > menuIngredient.quantity) {
                    return res.status(400).json({ message: `Cannot remove more ${removed.inventoryItem} than what's in the menu item` });
                }
                
                processedRemovedIngredients.push({
                    inventoryItem: removed.inventoryItem,
                    name: removed.name,
                    quantity: removed.quantity
                });
            }
        }
        
        // Deduct ingredients from inventory (accounting for removed ingredients)
        await deductIngredients(menuItemDoc, quantity, processedAddOns, processedRemovedIngredients);
        
        // Generate simple sequential order ID
        const orderID = await generateOrderID();
        
        // Calculate total amount
        let totalAmount = menuItemDoc.price * quantity;
        
        // Add add-ons to total
        for (const addOn of processedAddOns) {
            totalAmount += addOn.price * addOn.quantity;
        }
        
        const sale = new Sales({
            orderID,
            menuItem,
            quantity,
            price: menuItemDoc.price,
            addOns: processedAddOns,
            removedIngredients: processedRemovedIngredients,
            paymentMethod,
            serviceType,
            totalAmount
        });
        
        await sale.save();
        res.status(201).json(sale);
    } catch (err) {
        res.status(400).json({ message: err.message });
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
