// Global variables
let menuItems = [];
let cartItems = [];
let selectedCategory = 'All';
let searchQuery = '';
let orderType = 'dine-in';
let paymentMethod = 'cash';
let currentModalItem = null;
let selectedAddons = [];

// API Base URL - using config system
// Use API_BASE_URL from config.js

// Authentication utilities
function getAuthToken() {
    const token = localStorage.getItem('authToken');
    console.log('Getting auth token:', token ? 'Token found' : 'No token found');
    return token;
}

function isAuthenticated() {
    const token = getAuthToken();
    if (!token) {
        console.log('No token found in localStorage');
        return false;
    }
    
    try {
        // Decode JWT token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        console.log('Token payload:', payload);
        console.log('Current time:', currentTime);
        console.log('Token expires at:', payload.exp);
        
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expired, removing from storage');
            localStorage.removeItem('authToken');
            return false;
        }
        
        console.log('Token is valid');
        return true;
    } catch (error) {
        console.error('Error checking token:', error);
        localStorage.removeItem('authToken');
        return false;
    }
}

function redirectToLogin() {
    console.log('Redirecting to login due to authentication failure');
    localStorage.removeItem('authToken'); // Clear invalid token
    window.location.href = '../login.html';
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        console.log(`Making API request to: ${API_BASE_URL}${endpoint}`);
        console.log('Using token:', token ? 'Yes' : 'No');
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('Authentication failed, redirecting to login');
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error(`HTTP ${response.status} error data:`, JSON.stringify(errorData, null, 2));
            } catch (e) {
                const errorText = await response.text();
                errorData = { message: errorText };
                console.error(`HTTP ${response.status} error text:`, errorText);
            }
            
            // Create a more detailed error object
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        const data = await response.json();
        console.log('API response data:', data);
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// DOM Elements
let menuItemsGrid = null;
let cartItemsContainer = null;
let cartTotal = null;
let searchInput = null;
let categoryButtons = null;
let orderTypeButtons = null;
let paymentMethodButtons = null;

// Initialize DOM elements
function initializeDOMElements() {
    menuItemsGrid = document.getElementById('menuItemsGrid');
    cartItemsContainer = document.getElementById('cartItems');
    cartTotal = document.getElementById('cartTotal');
    searchInput = document.getElementById('searchInput');
    categoryButtons = document.querySelectorAll('[data-category]');
    orderTypeButtons = document.querySelectorAll('[data-order-type]');
    paymentMethodButtons = document.querySelectorAll('[data-payment]');
}

// Modal instance
let menuItemModal = null;
let paymentModal = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements
    initializeDOMElements();
    
    // Check authentication
    if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        redirectToLogin();
        return;
    }

    console.log('User authenticated, loading POS system');
    await loadMenuItems();
    setupEventListeners();
    setupModals();
    updateCart();
    
    // Add test button for notifications (for development/testing)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Test notification button
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Notification';
        testButton.className = 'btn btn-info btn-sm position-fixed';
        testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
        testButton.onclick = function() {
            showGlobalNotification('Test notification from POS!', 'success');
        };
        document.body.appendChild(testButton);
        
        // Test order processing notification button
        const testOrderButton = document.createElement('button');
        testOrderButton.textContent = 'Test Order Processing';
        testOrderButton.className = 'btn btn-warning btn-sm position-fixed';
        testOrderButton.style.cssText = 'bottom: 60px; right: 20px; z-index: 9999;';
        testOrderButton.onclick = function() {
            testOrderProcessingNotification();
        };
        document.body.appendChild(testOrderButton);
    }
});

// Setup Bootstrap modals
function setupModals() {
    const menuItemModalElement = document.getElementById('menuItemModal');
    const paymentModalElement = document.getElementById('paymentModal');
    
    if (menuItemModalElement) {
        menuItemModal = new bootstrap.Modal(menuItemModalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }
    
    if (paymentModalElement) {
        paymentModal = new bootstrap.Modal(paymentModalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }
}

// Load menu items from API
async function loadMenuItems() {
    try {
        const response = await apiRequest('/menu/all-with-stock');
        console.log('API Response:', response);
        
        if (response && response.success) {
            menuItems = response.data || [];
        } else {
            menuItems = [];
        }
        
        console.log('Menu items loaded:', menuItems.length);
        if (menuItems.length > 0) {
            console.log('Sample menu item:', menuItems[0]);
            console.log('Sample menu item image:', menuItems[0].image);
        }
        
        renderMenuItems();
    } catch (error) {
        console.error('Failed to load menu items:', error);
        menuItems = [];
        renderMenuItems();
        // Don't show error alert for now to avoid blocking the page
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Search Input
            searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderMenuItems();
            });

    // Category Buttons
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
        categoryButtons.forEach(btn => {
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-outline-danger');
            });
            button.classList.remove('btn-outline-danger');
            button.classList.add('btn-danger');
            selectedCategory = button.dataset.category;
            renderMenuItems();
        });
    });

    // Order Type Buttons
    orderTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            orderTypeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const orderTypeMap = {
                'Dine-in': 'dine-in',
                'Takeout': 'takeout'
            };
            orderType = orderTypeMap[button.dataset.orderType] || 'dine-in';
        });
    });

    // Payment Method Buttons
    paymentMethodButtons.forEach(button => {
        button.addEventListener('click', () => {
            paymentMethodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const paymentMap = {
                'Cash': 'cash',
                'GCash': 'gcash',
                'Maya': 'paymaya'
            };
            paymentMethod = paymentMap[button.dataset.payment] || 'cash';
        });
    });

    // Modal quantity controls
    const decreaseBtn = document.getElementById('decreaseQuantity');
    const increaseBtn = document.getElementById('increaseQuantity');
    const quantityInput = document.getElementById('modalQuantity');

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value) || 1;
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
                updateModalTotal();
            }
        });
    }

    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value) || 1;
            quantityInput.value = currentValue + 1;
            updateModalTotal();
        });
    }

    if (quantityInput) {
        quantityInput.addEventListener('input', () => {
            updateModalTotal();
        });
    }

    // Add-ons selection
    document.querySelectorAll('.addon-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            handleAddonSelection(e.target);
            updateModalTotal();
        });
    });



    // Add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }

    // Checkout Button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }

    // Confirm Order Button
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    if (confirmOrderBtn) {
        confirmOrderBtn.addEventListener('click', handlePaymentConfirm);
    }

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarMenu = document.getElementById('sidebarMenu');
    
    if (sidebarToggle && sidebarMenu) {
        sidebarToggle.addEventListener('click', () => {
            sidebarMenu.classList.toggle('show');
        });
    }

    if (closeSidebar && sidebarMenu) {
        closeSidebar.addEventListener('click', () => {
            sidebarMenu.classList.remove('show');
        });
    }

    // Bootstrap accordions handle their own collapse behavior
}

// Bootstrap accordions handle their own collapse behavior automatically

// Format category for display
function formatCategory(category) {
    const categoryMap = {
        'ramen': 'Ramen',
        'rice bowls': 'Rice Bowls',
        'side dishes': 'Side Dishes',
        'sushi': 'Sushi',
        'party trays': 'Party Trays',
        'add-ons': 'Add-ons',
        'drinks': 'Drinks'
    };
    return categoryMap[category] || category;
}

// Render Menu Items
function renderMenuItems() {
    if (!menuItemsGrid) {
        console.error('Menu items grid not found');
        return;
    }
    
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery);
        const matchesCategory = selectedCategory === 'All' || formatCategory(item.category) === selectedCategory;
        // Hide add-ons category from the main menu display
        const isNotAddOn = item.category.toLowerCase() !== 'add-ons';
        return matchesSearch && matchesCategory && isNotAddOn;
    });

    console.log('Rendering menu items:', filteredItems.length);
    console.log('Filtered out add-ons from main menu display');
    
    menuItemsGrid.innerHTML = filteredItems.map(item => {
        // Use the image directly from backend data
        const backendImage = item.image;
        const imageUrl = getImageUrl(backendImage);
        console.log(`Rendering ${item.name} with backend image: ${backendImage} -> ${imageUrl}`);
        
        // Determine card styling based on stock status
        let cardClass = "card h-100 menu-item-card";
        let stockBadge = "";
        
        if (!item.canBeOrdered) {
            cardClass += " out-of-stock-card";
            stockBadge = '<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2">Some Out of Stock</span>';
        }
        
        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="${cardClass}" onclick="openModal('${item._id}', '${item.name}', ${item.price}, '${item.category}', '${backendImage}')">
                    ${stockBadge}
                    <img src="${imageUrl}" class="card-img-top" alt="${item.name}" style="height: 150px; object-fit: contain;" onerror="this.src='../assets/ramen1.jpg'">
                    <div class="card-body p-2">
                        <h6 class="card-title mb-1">${item.name}</h6>
                        <p class="card-text text-danger fw-bold mb-0">₱${item.price.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to get correct image URL from backend data
function getImageUrl(imagePath) {
  console.log('Processing image path from backend:', imagePath);
  
  if (!imagePath) {
    console.log('No image path provided, using default');
    return '../assets/ramen1.jpg';
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    console.log('Full URL detected:', imagePath);
    return imagePath;
  }
  
  // If it starts with /uploads/, it's a backend uploaded image
  if (imagePath.startsWith('/uploads/')) {
    const fullUrl = `${getUploadUrl()}${imagePath}`;
    console.log('Backend uploaded image:', fullUrl);
    return fullUrl;
  }
  
  // If it's a relative path from backend (../assets/...), use it directly
  if (imagePath.startsWith('../assets/')) {
    console.log('Using backend asset path:', imagePath);
    return imagePath;
  }
  
  // If it's just a filename (like uploaded images), it's a backend uploaded image
  if (!imagePath.includes('/') && imagePath.includes('.')) {
    // Check if it's a default image that might not exist in uploads
    if (imagePath === 'default-ramen.jpg' || imagePath.startsWith('default-')) {
      console.log('Default image detected, using database image instead');
      // Use the specific image from the database
      const databaseImage = '1756859309524-197330587-databaseDesign.jpg';
      const fullUrl = `${getUploadUrl()}/uploads/menus/${databaseImage}`;
      console.log('Using database image:', fullUrl);
      return fullUrl;
    }
    const fullUrl = `${getUploadUrl()}/uploads/menus/${imagePath}`;
    console.log('Backend uploaded filename, using uploads path:', fullUrl);
    return fullUrl;
  }
  
  // If it's just a filename without extension, assume it's in assets
  if (!imagePath.includes('/')) {
    const assetPath = `../assets/${imagePath}`;
    console.log('Backend filename, using assets path:', assetPath);
    return assetPath;
  }
  
  // If it's any other path from backend, try to use it as is
  console.log('Using backend path as is:', imagePath);
  return imagePath;
}

// Open Modal
function openModal(itemId, itemName, itemPrice, itemCategory, itemImage) {
    console.log('Opening modal with backend image:', itemImage);
    
    // Find the menu item with inventory data
    const menuItem = menuItems.find(item => item._id === itemId);
    
    currentModalItem = {
        id: itemId,
        name: itemName,
        price: itemPrice,
        category: itemCategory,
        image: itemImage,
        canBeOrdered: menuItem ? menuItem.canBeOrdered : true,
        hasOutOfStock: menuItem ? menuItem.hasOutOfStock : false,
        hasLowStock: menuItem ? menuItem.hasLowStock : false,
        ingredientsWithStock: menuItem ? menuItem.ingredientsWithStock : []
    };

    // Reset modal state
    resetModalState();

    // Update modal content using backend image
    document.getElementById('menuItemModalLabel').textContent = itemName;
    const modalImage = document.getElementById('modalItemImage');
    modalImage.src = getImageUrl(itemImage);
    modalImage.onerror = function() { this.src = '../assets/ramen1.jpg'; };
    document.getElementById('modalItemPrice').textContent = `₱${itemPrice.toFixed(2)}`;
    document.getElementById('modalQuantity').value = '1';

    // Show stock status in modal
    updateModalStockStatus();

    // Load ingredients and add-ons for the new collapsible design
    loadMenuIngredients(itemId);
    loadAddOns();

    // Update total
    updateModalTotal();

    // Show modal
    if (menuItemModal) {
        menuItemModal.show();
    }
}

// Update modal stock status display
function updateModalStockStatus() {
    if (!currentModalItem) return;
    
    // Find or create stock status container
    let stockStatusContainer = document.getElementById('modalStockStatus');
    if (!stockStatusContainer) {
        // Create stock status container after the price
        const priceElement = document.getElementById('modalItemPrice');
        stockStatusContainer = document.createElement('div');
        stockStatusContainer.id = 'modalStockStatus';
        stockStatusContainer.className = 'mt-2';
        priceElement.parentNode.insertBefore(stockStatusContainer, priceElement.nextSibling);
    }
    
    // Clear previous content
    stockStatusContainer.innerHTML = '';
    
    if (!currentModalItem.canBeOrdered) {
        // Item has out of stock ingredients - no warning message shown
        stockStatusContainer.innerHTML = '';
    }
}

// Reset modal state
function resetModalState() {
    // Reset all checkboxes
    document.querySelectorAll('#ingredientsGrid input[type="checkbox"], #addOnsGrid input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Remove selected classes from all cards
    document.querySelectorAll('#ingredientsGrid .card, #addOnsGrid .card').forEach(card => {
        card.classList.remove('bg-danger', 'bg-opacity-10', 'bg-success', 'bg-opacity-10');
    });

    selectedAddons = [];
}

// Toggle modal sections and load add-ons
function toggleModalSections(category) {
    const addOnsSection = document.getElementById('addOnsSection');
    const addOnsGrid = document.getElementById('addOnsGrid');

    if (category.toLowerCase() === 'ramen') {
        if (addOnsSection) addOnsSection.classList.remove('d-none');
        
        // Load add-ons from menu data
        loadAddOnsFromMenu();
            } else {
        if (addOnsSection) addOnsSection.classList.add('d-none');
    }
}

// Load add-ons from menu data
function loadAddOnsFromMenu() {
    const addOnsGrid = document.getElementById('addOnsGrid');
    if (!addOnsGrid) return;

    // Filter menu items to get only add-ons
    const addOns = menuItems.filter(item => item.category.toLowerCase() === 'add-ons');
    
    console.log('Loading add-ons from menu:', addOns);

    if (addOns.length > 0) {
        addOnsGrid.innerHTML = addOns.map(addon => `
            <div class="col-6">
                <div class="card addon-card" data-addon="${addon._id}" data-price="${addon.price}">
                    <div class="card-body p-2 text-center">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="addon_${addon._id}">
                            <label class="form-check-label" for="addon_${addon._id}">
                                <img src="${getImageUrl(addon.image)}" class="img-fluid mb-1" style="height: 40px; object-fit: contain;" alt="${addon.name}" onerror="this.src='../assets/ramen1.jpg'">
                                <small>${addon.name}</small>
                                <div class="text-danger small">+₱${addon.price.toFixed(2)}</div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners for new add-on checkboxes
        document.querySelectorAll('.addon-card input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                handleAddonSelection(e.target);
                updateModalTotal();
            });
                });
            } else {
        // If no add-ons in menu, show default ones
        addOnsGrid.innerHTML = `
            <div class="col-6">
                <div class="card addon-card" data-addon="extraNoodles" data-price="50">
                    <div class="card-body p-2 text-center">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="extraNoodles">
                            <label class="form-check-label" for="extraNoodles">
                                <i class="fas fa-utensils mb-1 d-block"></i>
                                <small>Extra Noodles</small>
                                <div class="text-danger small">+₱50</div>
                            </label>
                        </div>
                                </div>
                            </div>
                        </div>
            <div class="col-6">
                <div class="card addon-card" data-addon="extraChashu" data-price="80">
                    <div class="card-body p-2 text-center">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="extraChashu">
                            <label class="form-check-label" for="extraChashu">
                                <i class="fas fa-drumstick-bite mb-1 d-block"></i>
                                <small>Extra Chashu</small>
                                <div class="text-danger small">+₱80</div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Handle addon selection
function handleAddonSelection(checkbox) {
    const addonId = checkbox.id;
    const addonCard = checkbox.closest('.card');
    const addonPrice = parseFloat(addonCard.querySelector('small.text-success').textContent.replace('+₱', ''));
    const addonName = addonCard.querySelector('small.fw-bold').textContent;
    
    // Extract the actual ObjectId from the checkbox ID
    // Checkbox ID format: "addon_6879a1f70355e876dc25c9d9" -> extract "6879a1f70355e876dc25c9d9"
    const actualAddonId = addonId.startsWith('addon_') ? addonId.substring(6) : addonId;

    console.log('Addon selection:', { 
        checkboxId: addonId, 
        actualId: actualAddonId, 
        name: addonName, 
        price: addonPrice, 
        checked: checkbox.checked 
    });

    if (checkbox.checked) {
        addonCard.classList.add('bg-success', 'bg-opacity-10');
        selectedAddons.push({
            id: actualAddonId, // Store the actual ObjectId
            checkboxId: addonId, // Keep checkbox ID for UI operations
            name: addonName,
            price: addonPrice,
            action: 'add' // Mark as add-on
        });
    } else {
        addonCard.classList.remove('bg-success', 'bg-opacity-10');
        selectedAddons = selectedAddons.filter(addon => addon.checkboxId !== addonId);
    }
    
    console.log('Current selected addons:', selectedAddons.filter(item => item.action === 'add'));
    updateModalTotal();
}

// Load menu ingredients for removal
async function loadMenuIngredients(menuItemId) {
    const ingredientsGrid = document.getElementById('ingredientsGrid');
    if (!ingredientsGrid) return;

    try {
        console.log('Loading ingredients for menu item:', menuItemId);
        
        // Get the specific menu item to get its ingredients
        const menuItemResponse = await apiRequest(`/menu/${menuItemId}`);
        console.log('Menu item response:', menuItemResponse);
        
        // Extract the actual menu item data from the response
        const menuItem = menuItemResponse.data || menuItemResponse;
        console.log('Menu item data:', menuItem);
        
        if (!menuItem || !menuItem.ingredients || menuItem.ingredients.length === 0) {
            console.log('No ingredients found in menu item, showing message');
            ingredientsGrid.innerHTML = '<div class="col-12 text-center text-muted">No ingredients available for removal</div>';
            return;
        }

        console.log('Menu item ingredients:', menuItem.ingredients);

        // Get current modal item with stock information
        const currentItem = menuItems.find(item => item._id === menuItemId);
        const stockInfo = currentItem ? currentItem.ingredientsWithStock : [];
        
        // Use the ingredients directly from the menu item with stock information
        const availableIngredients = menuItem.ingredients.map(ing => {
            const stockData = stockInfo.find(stock => stock.inventoryItem === ing.inventoryItem);
            return {
                name: ing.inventoryItem,
                units: 'pieces', // Default units since we don't have this info from menu
                quantity: ing.quantity,
                currentStock: stockData ? stockData.currentStock : 0,
                isOutOfStock: stockData ? stockData.isOutOfStock : false,
                isLowStock: stockData ? stockData.isLowStock : false
            };
        });
        console.log('Available ingredients for removal:', availableIngredients);

        if (availableIngredients.length === 0) {
            ingredientsGrid.innerHTML = '<div class="col-12 text-center text-muted">No ingredients available for removal</div>';
            return;
        }

        // Render ingredient cards using Bootstrap
        ingredientsGrid.innerHTML = availableIngredients.map(ingredient => {
            // Determine card styling based on stock status
            let cardClass = "card h-100";
            let stockBadge = "";
            
            if (ingredient.isOutOfStock) {
                cardClass += " border-danger";
                stockBadge = '<span class="badge bg-danger position-absolute top-0 end-0 m-1" style="font-size: 0.6rem;">Out</span>';
            } else {
                cardClass += " border-success";
            }
            
            return `
                <div class="col-6">
                    <div class="${cardClass} position-relative" data-ingredient="${ingredient.name}" style="height: 70px;">
                        ${stockBadge}
                        <div class="card-body p-2 d-flex align-items-center">
                            <div class="form-check d-flex align-items-center flex-grow-1">
                                <input class="form-check-input me-3" type="checkbox" id="ingredient_${ingredient.name}" 
                                       data-ingredient="${ingredient.name}" data-quantity="${ingredient.quantity}"
                                       onchange="handleIngredientSelection(this)">
                                <div class="vr me-3" style="height: 30px; opacity: 0.3; border-color: #dc3545;"></div>
                                <label class="form-check-label flex-grow-1" for="ingredient_${ingredient.name}">
                                    <div>
                                        <div class="fw-bold text-dark" style="font-size: 14px;">${ingredient.name}</div>
                                        <small class="text-muted" style="font-size: 11px;">${ingredient.units}</small>
                                        <div class="text-primary fw-bold" style="font-size: 12px;">Stock: ${ingredient.currentStock}</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        console.log('Rendered ingredient cards for removal');

    } catch (error) {
        console.error('Failed to load menu ingredients:', error);
        ingredientsGrid.innerHTML = '<div class="col-12 text-center text-muted">Failed to load ingredients</div>';
    }
}

// Load add-ons
async function loadAddOns() {
    const addOnsGrid = document.getElementById('addOnsGrid');
    if (!addOnsGrid) return;

    try {
        // Get add-ons from the menu items with stock information
        const addOnsWithStock = menuItems.filter(item => item.category === 'add-ons');
        
        if (!addOnsWithStock || addOnsWithStock.length === 0) {
            addOnsGrid.innerHTML = '<div class="col-12 text-center text-muted">No add-ons available</div>';
            return;
        }

        // Render add-on cards using Bootstrap with stock information
        addOnsGrid.innerHTML = addOnsWithStock.map(addon => {
            // Determine card styling based on stock status
            let cardClass = "card h-100";
            let stockBadge = "";
            
            if (!addon.canBeOrdered) {
                cardClass += " border-danger";
                stockBadge = '<span class="badge bg-danger position-absolute top-0 end-0 m-1" style="font-size: 0.6rem;">Out</span>';
            } else {
                cardClass += " border-success";
            }
            
            // Get stock information for the add-on
            let stockInfo = "";
            if (addon.ingredientsWithStock && addon.ingredientsWithStock.length > 0) {
                const totalStock = addon.ingredientsWithStock.reduce((min, ing) => 
                    Math.min(min, ing.currentStock), Infinity
                );
                stockInfo = `<div class="text-primary fw-bold" style="font-size: 12px;">Stock: ${totalStock}</div>`;
            }
            
            return `
                <div class="col-6">
                    <div class="${cardClass} position-relative" data-addon="${addon._id}" style="height: 70px;">
                        ${stockBadge}
                        <div class="card-body p-2 d-flex align-items-center">
                            <div class="form-check d-flex align-items-center flex-grow-1">
                                <input class="form-check-input me-3" type="checkbox" id="addon_${addon._id}" 
                                       onchange="handleAddonSelection(this)">
                                <div class="vr me-3" style="height: 30px; opacity: 0.3; border-color: #198754;"></div>
                                <label class="form-check-label flex-grow-1" for="addon_${addon._id}">
                                    <div>
                                        <div class="fw-bold text-dark" style="font-size: 14px;">${addon.name}</div>
                                        <small class="text-success fw-bold" style="font-size: 11px;">+₱${addon.price.toFixed(2)}</small>
                                        ${stockInfo}
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Failed to load add-ons:', error);
        addOnsGrid.innerHTML = '<div class="col-12 text-center text-muted">Failed to load add-ons</div>';
    }
}

// Handle ingredient selection (for removal)
function handleIngredientSelection(checkbox) {
    const ingredientName = checkbox.id.replace('ingredient_', '');
    const ingredientCard = checkbox.closest('.card');
    
    if (checkbox.checked) {
        ingredientCard.classList.add('bg-danger', 'bg-opacity-10');
        // Add to selectedAddons with action: 'remove'
        selectedAddons.push({
            id: ingredientName,
            name: ingredientName,
            price: 0, // No price for removed ingredients
            action: 'remove'
        });
    } else {
        ingredientCard.classList.remove('bg-danger', 'bg-opacity-10');
        // Remove from selectedAddons
        selectedAddons = selectedAddons.filter(item => 
            !(item.name === ingredientName && item.action === 'remove')
        );
    }
    
    console.log('Current selected ingredients for removal:', selectedAddons.filter(item => item.action === 'remove'));
    updateModalTotal();
}

// Update modal total
function updateModalTotal() {
    if (!currentModalItem) return;

    const basePrice = currentModalItem.price;
    const quantity = parseInt(document.getElementById('modalQuantity').value) || 1;
    // Only count add-ons (action: 'add'), not removed ingredients (action: 'remove')
    const addonsTotal = selectedAddons
        .filter(addon => addon.action === 'add' || !addon.action) // Include legacy add-ons without action
        .reduce((sum, addon) => sum + addon.price, 0);
    const total = (basePrice + addonsTotal) * quantity;

    const totalElement = document.getElementById('modalTotalPrice');
    if (totalElement) {
        totalElement.textContent = `₱${total.toFixed(2)}`;
    }
}

// Get currently selected ingredients from modal
function getSelectedIngredients() {
    const selectedIngredients = [];
    const ingredientCheckboxes = document.querySelectorAll('#ingredientsGrid input[type="checkbox"]:checked');
    
    ingredientCheckboxes.forEach(checkbox => {
        const ingredientName = checkbox.getAttribute('data-ingredient');
        const ingredientQuantity = parseFloat(checkbox.getAttribute('data-quantity')) || 1;
        
        if (ingredientName) {
            selectedIngredients.push({
                inventoryItem: ingredientName,
                quantity: ingredientQuantity
            });
        }
    });
    
    return selectedIngredients;
}

// Handle Add to Cart
function handleAddToCart() {
    if (!currentModalItem) return;

    // Check if there are any out-of-stock ingredients that haven't been removed
    if (!currentModalItem.canBeOrdered) {
        const outOfStockIngredients = currentModalItem.ingredientsWithStock.filter(ing => ing.isOutOfStock);
        if (outOfStockIngredients.length > 0) {
            // Check if any out-of-stock ingredients are still selected (not removed)
            const selectedIngredients = getSelectedIngredients();
            const stillSelectedOutOfStock = outOfStockIngredients.filter(ing => 
                selectedIngredients.some(selected => selected.inventoryItem === ing.inventoryItem)
            );
            
            if (stillSelectedOutOfStock.length > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Cannot Add to Cart',
                    html: `
                        <p>This item cannot be added because some ingredients are out of stock:</p>
                        <ul class="text-start">
                            ${stillSelectedOutOfStock.map(ing => `<li>${ing.inventoryItem} (Available: ${ing.currentStock})</li>`).join('')}
                        </ul>
                        <p class="mt-3">Please remove these ingredients to add the item to your cart.</p>
                    `,
                    confirmButtonText: 'OK'
                });
                return;
            }
        }
    }

    const quantity = parseInt(document.getElementById('modalQuantity').value) || 1;

    const cartItem = {
        ...currentModalItem,
        quantity: quantity,
        addons: [...selectedAddons],
        total: parseFloat(document.getElementById('modalTotalPrice').textContent.replace('₱', ''))
    };

    cartItems.push(cartItem);
    updateCart();

    // Close modal
    if (menuItemModal) {
        menuItemModal.hide();
    }

    // Show notification
    Swal.fire({
        icon: 'success',
        title: 'Added to Cart!',
        text: `${cartItem.name} has been added to your cart.`,
        timer: 1500,
        showConfirmButton: false
    });
}

// Update Cart
function updateCart() {
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="text-center text-muted py-4">Your cart is empty</div>';
    } else {
        cartItemsContainer.innerHTML = cartItems.map((item, index) => `
            <div class="cart-item border-bottom pb-2 mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${item.name}</h6>
                        <small class="text-muted">
                            Qty: ${item.quantity} × ₱${item.price.toFixed(2)}
                            ${formatCartCustomizations(item.addons)}
                        </small>
                        </div>
                    <div class="text-end">
                        <span class="fw-bold">₱${item.total.toFixed(2)}</span>
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="removeCartItem(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                            </div>
                    </div>
        `).join('');
    }

    const total = cartItems.reduce((sum, item) => sum + item.total, 0);
    cartTotal.textContent = `₱${total.toFixed(2)}`;
}

// Format cart customizations to distinguish between added and removed items
function formatCartCustomizations(addons) {
    if (!addons || addons.length === 0) return '';
    
    const addedItems = addons.filter(item => item.action === 'add' || !item.action);
    const removedItems = addons.filter(item => item.action === 'remove');
    
    let customizations = '';
    
    if (addedItems.length > 0) {
        customizations += `<br><span class="text-success">Add: ${addedItems.map(a => a.name).join(', ')}</span>`;
    }
    
    if (removedItems.length > 0) {
        customizations += `<br><span class="text-danger">Remove: ${removedItems.map(r => r.name).join(', ')}</span>`;
    }
    
    return customizations;
}

// Remove Cart Item
function removeCartItem(index) {
    cartItems.splice(index, 1);
    updateCart();
}

// Handle Checkout
function handleCheckout() {
    if (cartItems.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cart is empty',
            text: 'Please add items to cart first',
            confirmButtonColor: '#dc3545'
        });
        return;
    }

    const orderTypeIcon = document.querySelector(`[data-order-type="${orderType === 'dine-in' ? 'Dine-in' : 'Takeout'}"] i`).className;
    const paymentMethodIcon = document.querySelector(`[data-payment="${paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya'}"] i`).className;
    const total = cartItems.reduce((sum, item) => sum + item.total, 0);

    document.getElementById('orderTypeIcon').className = orderTypeIcon;
    document.getElementById('orderTypeText').textContent = orderType === 'dine-in' ? 'Dine-in' : 'Takeout';
    document.getElementById('paymentMethodIcon').className = paymentMethodIcon;
    document.getElementById('paymentMethodText').textContent = paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Maya';
    document.getElementById('paymentTotal').textContent = `₱${total.toFixed(2)}`;

    if (paymentModal) {
        paymentModal.show();
    }
}

// Handle Payment Confirm
async function handlePaymentConfirm() {
    try {
        // Prepare all items for single order
        const items = cartItems.map(item => {
            // Separate actual add-ons from removed ingredients
            const actualAddOns = item.addons.filter(addon => addon.action === 'add' || !addon.action);
            const removedIngredients = item.addons.filter(addon => addon.action === 'remove');
            
            return {
                menuItem: item.id,
                quantity: item.quantity,
                addOns: actualAddOns.map(addon => ({
                    menuItem: addon.id, // This is now the actual ObjectId
                    quantity: 1
                })),
                removedIngredients: removedIngredients.map(ingredient => ({
                    inventoryItem: ingredient.inventoryItem || ingredient.name,
                    name: ingredient.name,
                    quantity: 1
                }))
            };
        });

        const orderData = {
            items: items,
            paymentMethod: paymentMethod,
            serviceType: orderType
        };

        console.log('Sending multiple sales order data:', orderData);

        const response = await apiRequest('/sales/new-multiple-sales', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        console.log('Order response:', response);
        console.log('Successfully processed order with ID:', response.orderID);

        // Handle successful order
        Swal.fire({
            title: 'Order Completed!',
            text: `Successfully processed ${response.totalItems} items with Order ID: ${response.orderID}!`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
        }).then(() => {
            cartItems = [];
            updateCart();
            if (paymentModal) {
                paymentModal.hide();
            }
        });

    } catch (error) {
        console.error('Error processing order:', error);
        console.error('Error status:', error.status);
        console.error('Error data:', error.data);
        
        // Handle different types of errors with user-friendly messages
        let errorTitle = 'Order Failed';
        let errorMessage = 'Failed to process order. Please try again.';
        let errorDetails = '';
        
        if (error.status === 401) {
            errorTitle = 'Authentication Required';
            errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.status === 400) {
            errorTitle = 'Invalid Order';
            
            // Check if it's a stock-related error
            if (error.data && error.data.message && error.data.message.includes('Some items failed to process')) {
                errorMessage = 'Some items are out of stock:';
                
                // Parse the error details for stock issues
                if (error.data.errors && Array.isArray(error.data.errors)) {
                    const stockErrors = error.data.errors.filter(err => err.error && err.error.includes('Insufficient stock'));
                    if (stockErrors.length > 0) {
                        errorDetails = stockErrors.map(err => {
                            // Extract ingredient name and stock info from error message
                            const match = err.error.match(/Insufficient stock for (.+)\. Available: (\d+), Required: (\d+)/);
                            if (match) {
                                const [, ingredient, available, required] = match;
                                return `• ${ingredient}: Need ${required}, but only ${available} available`;
                            }
                            return `• ${err.error}`;
                        }).join('<br>');
                    }
                }
            } else if (error.data && error.data.message && error.data.message.includes('Insufficient stock')) {
                errorMessage = 'Some items are out of stock:';
                
                // Handle single error case
                const match = error.data.message.match(/Insufficient stock for (.+)\. Available: (\d+), Required: (\d+)/);
                if (match) {
                    const [, ingredient, available, required] = match;
                    errorDetails = `• ${ingredient}: Need ${required}, but only ${available} available`;
                } else {
                    errorDetails = `• ${error.data.message}`;
                }
            } else if (error.data && error.data.message) {
                errorMessage = error.data.message;
            } else {
                errorMessage = 'Invalid order data. Please check your cart and try again.';
            }
        } else if (error.status === 500) {
            errorTitle = 'Server Error';
            errorMessage = 'Something went wrong on our end. Please try again later.';
        } else if (error.message && error.message.includes('Failed to fetch')) {
            errorTitle = 'Connection Error';
            errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        }

        // Show error with details if available
        const errorHtml = errorDetails ? 
            `<p>${errorMessage}</p><div class="text-start"><strong>Details:</strong><br>${errorDetails}</div>` : 
            errorMessage;

        Swal.fire({
            icon: 'error',
            title: errorTitle,
            html: errorHtml,
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
        });
    }
} 