const Menu = require('../models/menu');
const Inventory = require('../models/inventory');

// Get all menu items
const getAllMenu = async (req, res) => {
  try {
    const menuItems = await Menu.find({});
    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: error.message
    });
  }
};

// Get single menu item by ID
const getMenuById = async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu item',
      error: error.message
    });
  }
};

// Validate ingredients against inventory
const validateIngredients = async (ingredients) => {
  const missingIngredients = [];
  const invalidIngredients = [];

  for (const ingredient of ingredients) {
    // Frontend sends 'name' field, backend expects 'inventoryItem'
    const ingredientName = ingredient.name || ingredient.inventoryItem;
    
    // Check if ingredient exists in inventory
    const inventoryItem = await Inventory.findOne({ name: ingredientName });
    
    if (!inventoryItem) {
      missingIngredients.push(ingredientName);
    } else if (ingredient.quantity <= 0) {
      invalidIngredients.push(`${ingredientName}: quantity must be greater than 0`);
    }
  }

  return { missingIngredients, invalidIngredients };
};

// Create new menu item
const createMenu = async (req, res) => {
  try {
    const { name, price, category, ingredients } = req.body;
    let image = req.body.image;
    if (req.file) {
      image = req.file.filename; // Store only the filename
    }
    
    // Validate required fields
    if (!name || !price || !category || !image) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, category, and image are required'
      });
    }

    // Parse ingredients if it's a JSON string
    let parsedIngredients = ingredients;
    if (typeof ingredients === 'string') {
      try {
        parsedIngredients = JSON.parse(ingredients);
      } catch (error) {
        console.error('Error parsing ingredients:', error);
        parsedIngredients = [];
      }
    }

    // Validate ingredients if provided
    if (parsedIngredients && Array.isArray(parsedIngredients) && parsedIngredients.length > 0) {
      const { missingIngredients, invalidIngredients } = await validateIngredients(parsedIngredients);
      
      if (missingIngredients.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some ingredients are not found in inventory',
          missingIngredients: missingIngredients
        });
      }

      if (invalidIngredients.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ingredient quantities',
          invalidIngredients: invalidIngredients
        });
      }

      // Convert frontend format to backend format
      const backendIngredients = parsedIngredients.map(ingredient => ({
        inventoryItem: ingredient.name,
        quantity: ingredient.quantity
      }));

      const newMenuItem = new Menu({
        name,
        price,
        category,
        image,
        ingredients: backendIngredients
      });

      const savedMenuItem = await newMenuItem.save();
      
      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: savedMenuItem
      });
    } else {
      // No ingredients provided
      const newMenuItem = new Menu({
        name,
        price,
        category,
        image,
        ingredients: []
      });

      const savedMenuItem = await newMenuItem.save();
      
      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: savedMenuItem
      });
    }
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating menu item',
      error: error.message
    });
  }
};

// Update menu item
const updateMenu = async (req, res) => {
  try {
    const { name, price, category, ingredients } = req.body;
    let image = req.body.image;
    if (req.file) {
      image = req.file.filename; // Store only the filename
    }
    
    // Parse ingredients if it's a JSON string
    let parsedIngredients = ingredients;
    if (typeof ingredients === 'string') {
      try {
        parsedIngredients = JSON.parse(ingredients);
      } catch (error) {
        console.error('Error parsing ingredients:', error);
        parsedIngredients = [];
      }
    }
    
    // Validate ingredients if provided
    if (parsedIngredients && Array.isArray(parsedIngredients) && parsedIngredients.length > 0) {
      const { missingIngredients, invalidIngredients } = await validateIngredients(parsedIngredients);
      
      if (missingIngredients.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some ingredients are not found in inventory',
          missingIngredients: missingIngredients
        });
      }

      if (invalidIngredients.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ingredient quantities',
          invalidIngredients: invalidIngredients
        });
      }

      // Convert frontend format to backend format
      const backendIngredients = parsedIngredients.map(ingredient => ({
        inventoryItem: ingredient.name,
        quantity: ingredient.quantity
      }));

      const updatedMenuItem = await Menu.findByIdAndUpdate(
        req.params.id,
        {
          name,
          price,
          category,
          image,
          ingredients: backendIngredients
        },
        { new: true, runValidators: true }
      );

      if (!updatedMenuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Menu item updated successfully',
        data: updatedMenuItem
      });
    } else {
      // No ingredients provided
      const updatedMenuItem = await Menu.findByIdAndUpdate(
        req.params.id,
        {
          name,
          price,
          category,
          image,
          ingredients: []
        },
        { new: true, runValidators: true }
      );

      if (!updatedMenuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Menu item updated successfully',
        data: updatedMenuItem
      });
    }
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu item',
      error: error.message
    });
  }
};

// Delete menu item
const deleteMenu = async (req, res) => {
  try {
    const deletedMenuItem = await Menu.findByIdAndDelete(req.params.id);
    
    if (!deletedMenuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
      data: deletedMenuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting menu item',
      error: error.message
    });
  }
};

// Get menu items by category
const getMenuByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const menuItems = await Menu.find({ category });
    
    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items by category',
      error: error.message
    });
  }
};

// Get add-ons specifically
const getAddOns = async (req, res) => {
  try {
    const addOns = await Menu.find({ category: 'add-ons' });
    
    res.status(200).json({
      success: true,
      count: addOns.length,
      data: addOns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching add-ons',
      error: error.message
    });
  }
};

module.exports = {
  getAllMenu,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuByCategory,
  getAddOns
};
