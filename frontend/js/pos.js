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
const API_BASE_URL = getApiUrl();

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
            const errorText = await response.text();
            console.error(`HTTP ${response.status} error:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
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
        const response = await apiRequest('/menu/all');
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
                'Takeout': 'takeout',
                'Pickup': 'takeout'
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
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('show');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.remove('show');
        });
    }
}

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
        
        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card h-100 menu-item-card" onclick="openModal('${item._id}', '${item.name}', ${item.price}, '${item.category}', '${backendImage}')">
                    <img src="${imageUrl}" class="card-img-top" alt="${item.name}" style="height: 150px; object-fit: cover;" onerror="this.src='../assets/ramen1.jpg'">
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
    
    currentModalItem = {
        id: itemId,
        name: itemName,
        price: itemPrice,
        category: itemCategory,
        image: itemImage
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

    // Show/hide sections based on category
    toggleModalSections(itemCategory);

    // Update total
    updateModalTotal();

    // Show modal
    if (menuItemModal) {
        menuItemModal.show();
    }
}

// Reset modal state
function resetModalState() {
    // Reset add-ons
    document.querySelectorAll('.addon-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedAddons = [];



    // Reset add-ons selection
    this.selectedAddons = [];
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
                                <img src="${getImageUrl(addon.image)}" class="img-fluid mb-1" style="height: 40px; object-fit: cover;" alt="${addon.name}" onerror="this.src='../assets/ramen1.jpg'">
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
    const addonCard = checkbox.closest('.addon-card');
    const addonPrice = parseFloat(addonCard.dataset.price);
    const addonName = addonCard.querySelector('small').textContent;
    
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
        selectedAddons.push({
            id: actualAddonId, // Store the actual ObjectId
            checkboxId: addonId, // Keep checkbox ID for UI operations
            name: addonName,
            price: addonPrice
        });
    } else {
        selectedAddons = selectedAddons.filter(addon => addon.checkboxId !== addonId);
    }
    
    console.log('Current selected addons:', selectedAddons);
}



// Update modal total
function updateModalTotal() {
    if (!currentModalItem) return;

    const basePrice = currentModalItem.price;
    const quantity = parseInt(document.getElementById('modalQuantity').value) || 1;
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const total = (basePrice + addonsTotal) * quantity;

    const totalElement = document.getElementById('modalTotalPrice');
    if (totalElement) {
        totalElement.textContent = `₱${total.toFixed(2)}`;
    }
}

// Handle Add to Cart
function handleAddToCart() {
    if (!currentModalItem) return;

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
                            ${item.addons.length > 0 ? `<br>Add-ons: ${item.addons.map(a => a.name).join(', ')}` : ''}
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
        // Process each cart item as a separate sale
        const orderPromises = cartItems.map(async (item) => {
            const orderData = {
                menuItem: item.id,
                quantity: item.quantity,
                addOns: item.addons.map(addon => ({
                    menuItem: addon.id, // This is now the actual ObjectId
                    quantity: 1
                })),
                paymentMethod: paymentMethod,
                serviceType: orderType
            };

            console.log('Sending individual order data:', orderData);
            console.log('Add-ons being sent:', orderData.addOns);

            return await apiRequest('/sales/new-sale', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
        });

        const responses = await Promise.all(orderPromises);
        console.log('All order responses:', responses);
        console.log('Successfully processed orders:', responses.length);

        // Handle successful order
        Swal.fire({
            title: 'Order Completed!',
            text: `Successfully processed ${responses.length} items!`,
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
        
        // Handle different types of errors
        let errorMessage = 'Failed to process order. Please try again.';
        
        if (error.message && error.message.includes('401')) {
            errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message && error.message.includes('400')) {
            errorMessage = 'Invalid order data. Please check your cart.';
        } else if (error.message && error.message.includes('500')) {
            errorMessage = 'Server error. Please try again later.';
        }

        Swal.fire({
            icon: 'error',
            title: 'Order Failed',
            text: errorMessage,
            confirmButtonColor: '#dc3545'
        });
    }
} 