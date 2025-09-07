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
    
    // Check authentication (with fallback for testing)
    if (!isAuthenticated()) {
        console.log('User not authenticated');
        
        // Check if we're in test mode (no auth token but want to continue)
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('test') === 'true';
        
        if (testMode) {
            console.log('Running in test mode without authentication');
            // Show a warning but continue
            Swal.fire({
                icon: 'warning',
                title: 'Test Mode',
                text: 'Running without authentication. Some features may not work.',
                confirmButtonText: 'Continue',
                confirmButtonColor: '#dc3545'
            });
        } else {
            console.log('Redirecting to login');
        redirectToLogin();
        return;
    }
    } else {
    console.log('User authenticated, loading POS system');
    }

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
        
        // Load fallback menu data if API fails
        menuItems = getFallbackMenuData();
        console.log('Using fallback menu data:', menuItems.length, 'items');
        
        renderMenuItems();
        
        // Show error notification but don't block the page
        Swal.fire({
            icon: 'warning',
            title: 'Menu Loading Issue',
            text: 'Could not load menu from server. Using sample data.',
            timer: 3000,
            showConfirmButton: false
        });
    }
}

// Fallback menu data for when API is not available
function getFallbackMenuData() {
    return [
        {
            _id: 'fallback-1',
            name: 'Tonkotsu Ramen',
            price: 250,
            category: 'ramen',
            image: '../assets/ramen1.jpg'
        },
        {
            _id: 'fallback-2',
            name: 'Miso Ramen',
            price: 220,
            category: 'ramen',
            image: '../assets/ramen2.jpg'
        },
        {
            _id: 'fallback-3',
            name: 'Chicken Teriyaki Bowl',
            price: 180,
            category: 'rice bowls',
            image: '../assets/ricebowl.jpg'
        },
        {
            _id: 'fallback-4',
            name: 'Gyoza (6pcs)',
            price: 120,
            category: 'side dishes',
            image: '../assets/side1.jpg'
        },
        {
            _id: 'fallback-5',
            name: 'Coca Cola',
            price: 35,
            category: 'drinks',
            image: '../assets/coke.webp'
        },
        {
            _id: 'fallback-6',
            name: 'Extra Noodles',
            price: 50,
            category: 'add-ons',
            image: '../assets/ramen1.jpg'
        },
        {
            _id: 'fallback-7',
            name: 'Extra Chashu',
            price: 80,
            category: 'add-ons',
            image: '../assets/ramen2.jpg'
        }
    ];
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
                    <img src="${imageUrl}" 
                         class="card-img-top" 
                         alt="${item.name}" 
                         style="height: 150px; object-fit: cover;" 
                         onerror="console.log('Image failed to load:', this.src); this.src='../assets/ramen1.jpg'"
                         onload="console.log('Image loaded successfully:', this.src)">
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
    
    // If it's just a filename (like uploaded images), it's a backend uploaded image
    if (!imagePath.includes('/') && imagePath.includes('.')) {
        const fullUrl = `${getUploadUrl()}/uploads/menus/${imagePath}`;
        console.log('Backend uploaded filename, using uploads path:', fullUrl);
        return fullUrl;
    }
    
    // If it's a relative path from backend (../assets/...), use it directly
    if (imagePath.startsWith('../assets/')) {
        console.log('Using backend asset path:', imagePath);
        return imagePath;
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
    const imageUrl = getImageUrl(itemImage);
    console.log('Modal image URL:', imageUrl);
    modalImage.src = imageUrl;
    modalImage.onerror = function() { 
        console.log('Modal image failed to load:', this.src);
        this.src = '../assets/ramen1.jpg'; 
    };
    modalImage.onload = function() {
        console.log('Modal image loaded successfully:', this.src);
    };
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
    // Reset ingredients
    document.querySelectorAll('.ingredient-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Remove selected class from ingredient cards
    document.querySelectorAll('.ingredient-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset add-ons
    document.querySelectorAll('.addon-card-modern input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Remove selected class from addon cards
    document.querySelectorAll('.addon-card-modern').forEach(card => {
        card.classList.remove('selected');
    });
    
    selectedAddons = [];
}

// Toggle modal sections and load add-ons
function toggleModalSections(category) {
    const addOnsSection = document.getElementById('addOnsSection');
    const addOnsGrid = document.getElementById('addOnsGrid');

    // Show add-ons section for all menu items
    if (addOnsSection) {
        addOnsSection.classList.remove('d-none');
        // Load add-ons from backend for all categories
        loadAddOnsFromMenu();
        
        // Setup collapse event listeners
        setupCollapseListeners();
    }
}

// Setup collapse event listeners for chevron rotation
function setupCollapseListeners() {
    // Ingredients collapse
    const ingredientsCollapse = document.getElementById('ingredientsCollapse');
    const ingredientsChevron = document.getElementById('ingredientsChevron');
    
    if (ingredientsCollapse && ingredientsChevron) {
        ingredientsCollapse.addEventListener('show.bs.collapse', function () {
            ingredientsChevron.style.transform = 'rotate(0deg)';
        });
        ingredientsCollapse.addEventListener('hide.bs.collapse', function () {
            ingredientsChevron.style.transform = 'rotate(-90deg)';
        });
    }
    
    // Add-ons collapse
    const addOnsCollapse = document.getElementById('addOnsCollapse');
    const addOnsChevron = document.getElementById('addOnsChevron');
    
    if (addOnsCollapse && addOnsChevron) {
        addOnsCollapse.addEventListener('show.bs.collapse', function () {
            addOnsChevron.style.transform = 'rotate(0deg)';
        });
        addOnsCollapse.addEventListener('hide.bs.collapse', function () {
            addOnsChevron.style.transform = 'rotate(-90deg)';
        });
    }
}

// Load ingredients and add-ons for specific menu item
async function loadAddOnsFromMenu() {
    const ingredientsGrid = document.getElementById('ingredientsGrid');
    const addOnsGrid = document.getElementById('addOnsGrid');
    
    if (!ingredientsGrid || !addOnsGrid || !currentModalItem) return;

    try {
        console.log('Loading ingredients and add-ons for menu item:', currentModalItem.id);
        
        // Load ingredients for the menu item
        await loadMenuIngredients(ingredientsGrid);
        
        // Load add-ons from backend
        await loadAddOns(addOnsGrid);
        
    } catch (error) {
        console.error('Error loading menu customization:', error);
        showFallbackAddOns(addOnsGrid);
    }
}

// Load ingredients for specific menu item
async function loadMenuIngredients(ingredientsGrid) {
    try {
        const response = await apiRequest(`/menu/${currentModalItem.id}`);
        
        if (response && response.success) {
            const menuItem = response.data;
            console.log('Menu item loaded:', menuItem);
            
            if (menuItem.ingredients && menuItem.ingredients.length > 0) {
                // Get ingredient details from inventory
                const ingredientPromises = menuItem.ingredients.map(async (ingredient) => {
                    try {
                        const inventoryResponse = await apiRequest(`/inventory/ingredients`);
                        if (inventoryResponse && inventoryResponse.success) {
                            const inventoryItem = inventoryResponse.data.find(item => 
                                item.name === ingredient.inventoryItem
                            );
                            return {
                                ...ingredient,
                                inventoryId: inventoryItem ? inventoryItem._id : null,
                                units: inventoryItem ? inventoryItem.units : 'pieces',
                                status: inventoryItem ? inventoryItem.status : 'in stock'
                            };
                        }
                        return ingredient;
                    } catch (error) {
                        console.error('Error fetching inventory item:', error);
                        return ingredient;
                    }
                });
                
                const ingredientsWithDetails = await Promise.all(ingredientPromises);
                console.log('Ingredients with details:', ingredientsWithDetails);

                ingredientsGrid.innerHTML = ingredientsWithDetails.map(ingredient => {
                    console.log(`Ingredient ${ingredient.inventoryItem} loaded for menu item`);
                    
                    // Get appropriate icon based on ingredient name
                    const getIngredientIcon = (name) => {
                        const nameLower = name.toLowerCase();
                        if (nameLower.includes('garlic')) return 'fas fa-circle';
                        if (nameLower.includes('onion')) return 'fas fa-circle';
                        if (nameLower.includes('green') && nameLower.includes('onion')) return 'fas fa-leaf';
                        if (nameLower.includes('seaweed')) return 'fas fa-leaf';
                        if (nameLower.includes('corn')) return 'fas fa-seedling';
                        if (nameLower.includes('bamboo')) return 'fas fa-tree';
                        if (nameLower.includes('egg')) return 'fas fa-egg';
                        if (nameLower.includes('meat') || nameLower.includes('chashu')) return 'fas fa-drumstick-bite';
                        if (nameLower.includes('noodle')) return 'fas fa-utensils';
                        if (nameLower.includes('soup') || nameLower.includes('broth')) return 'fas fa-bowl-food';
                        if (nameLower.includes('oil') || nameLower.includes('sauce')) return 'fas fa-tint';
                        return 'fas fa-circle';
                    };
                    
                    const ingredientId = ingredient.inventoryId || ingredient.inventoryItem;
                    
                    return `
                        <div class="col-6">
                            <div class="ingredient-card" data-ingredient="${ingredientId}" data-price="0">
                                <div class="ingredient-content">
                                    <div class="ingredient-icon">
                                        <i class="${getIngredientIcon(ingredient.inventoryItem)}"></i>
                                    </div>
                                    <div class="ingredient-info">
                                        <h6 class="ingredient-name">${ingredient.inventoryItem}</h6>
                                        <p class="ingredient-status">Remove</p>
                                    </div>
                                    <div class="ingredient-checkbox">
                                        <input type="checkbox" id="remove_${ingredientId}" class="ingredient-input">
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                // Re-attach event listeners for new ingredient checkboxes
                document.querySelectorAll('.ingredient-card input[type="checkbox"]').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        handleIngredientSelection(e.target);
                        updateModalTotal();
                    });
                });
            } else {
                // If no ingredients for this menu item, show message
                ingredientsGrid.innerHTML = `
                    <div class="col-12">
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-info-circle mb-2"></i>
                            <p class="mb-0">No ingredients to customize for this item</p>
                        </div>
                    </div>
                `;
            }
        } else {
            console.error('Failed to load menu item:', response);
        }
    } catch (error) {
        console.error('Error loading menu item ingredients:', error);
    }
}

// Load add-ons from backend
async function loadAddOns(addOnsGrid) {
    try {
        console.log('Loading add-ons from backend API...');
        const response = await apiRequest('/menu/add-ons');
        
        if (response && response.success) {
            const addOns = response.data;
            console.log('Add-ons loaded from backend:', addOns);

    if (addOns.length > 0) {
                addOnsGrid.innerHTML = addOns.map(addon => {
                    console.log(`Add-on ${addon.name} loaded from backend`);
                    
                    // Get appropriate icon based on addon name
                    const getAddonIcon = (name) => {
                        const nameLower = name.toLowerCase();
                        if (nameLower.includes('noodle')) return 'fas fa-utensils';
                        if (nameLower.includes('chashu') || nameLower.includes('meat')) return 'fas fa-drumstick-bite';
                        if (nameLower.includes('egg')) return 'fas fa-egg';
                        if (nameLower.includes('seaweed') || nameLower.includes('vegetable')) return 'fas fa-leaf';
                        if (nameLower.includes('sauce') || nameLower.includes('spice')) return 'fas fa-pepper-hot';
                        if (nameLower.includes('cheese')) return 'fas fa-cheese';
                        if (nameLower.includes('onion')) return 'fas fa-circle';
                        return 'fas fa-plus-circle';
                    };
                    
                    return `
            <div class="col-6">
                            <div class="addon-card-modern" data-addon="${addon._id}" data-price="${addon.price}">
                                <div class="addon-content">
                                    <div class="addon-icon">
                                        <i class="${getAddonIcon(addon.name)}"></i>
                        </div>
                                    <div class="addon-info">
                                        <h6 class="addon-name">${addon.name}</h6>
                                        <p class="addon-price">+₱${addon.price.toFixed(2)}</p>
                    </div>
                                    <div class="addon-checkbox">
                                        <input type="checkbox" id="addon_${addon._id}" class="addon-input">
                </div>
            </div>
                            </div>
                        </div>
                    `;
                }).join('');

        // Re-attach event listeners for new add-on checkboxes
                document.querySelectorAll('.addon-card-modern input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                handleAddonSelection(e.target);
                updateModalTotal();
            });
                });
            } else {
                // If no add-ons from backend, show message
                addOnsGrid.innerHTML = `
                    <div class="col-12">
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-info-circle mb-2"></i>
                            <p class="mb-0">No add-ons available</p>
                        </div>
                    </div>
                `;
            }
        } else {
            console.error('Failed to load add-ons from backend:', response);
            showFallbackAddOns(addOnsGrid);
        }
    } catch (error) {
        console.error('Error loading add-ons from backend:', error);
        showFallbackAddOns(addOnsGrid);
    }
}

        // Show fallback ingredients when backend is unavailable
        function showFallbackAddOns(addOnsGrid) {
            console.log('Showing fallback ingredients');
        addOnsGrid.innerHTML = `
            <div class="col-6">
                    <div class="ingredient-card" data-ingredient="garlic" data-price="0">
                        <div class="ingredient-content">
                            <div class="ingredient-icon">
                                <i class="fas fa-circle"></i>
                        </div>
                            <div class="ingredient-info">
                                <h6 class="ingredient-name">Garlic</h6>
                                <p class="ingredient-status">Remove</p>
                            </div>
                            <div class="ingredient-checkbox">
                                <input type="checkbox" id="remove_garlic" class="ingredient-input">
                            </div>
                                </div>
                            </div>
                        </div>
            <div class="col-6">
                    <div class="ingredient-card" data-ingredient="onion" data-price="0">
                        <div class="ingredient-content">
                            <div class="ingredient-icon">
                                <i class="fas fa-circle"></i>
                        </div>
                            <div class="ingredient-info">
                                <h6 class="ingredient-name">Onion</h6>
                                <p class="ingredient-status">Remove</p>
                            </div>
                            <div class="ingredient-checkbox">
                                <input type="checkbox" id="remove_onion" class="ingredient-input">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="ingredient-card" data-ingredient="green_onion" data-price="0">
                        <div class="ingredient-content">
                            <div class="ingredient-icon">
                                <i class="fas fa-leaf"></i>
                            </div>
                            <div class="ingredient-info">
                                <h6 class="ingredient-name">Green Onion</h6>
                                <p class="ingredient-status">Remove</p>
                            </div>
                            <div class="ingredient-checkbox">
                                <input type="checkbox" id="remove_green_onion" class="ingredient-input">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="ingredient-card" data-ingredient="seaweed" data-price="0">
                        <div class="ingredient-content">
                            <div class="ingredient-icon">
                                <i class="fas fa-leaf"></i>
                            </div>
                            <div class="ingredient-info">
                                <h6 class="ingredient-name">Seaweed</h6>
                                <p class="ingredient-status">Remove</p>
                            </div>
                            <div class="ingredient-checkbox">
                                <input type="checkbox" id="remove_seaweed" class="ingredient-input">
                            </div>
                    </div>
                </div>
            </div>
        `;

            // Re-attach event listeners for fallback ingredients
            document.querySelectorAll('.ingredient-card input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    handleIngredientSelection(e.target);
                    updateModalTotal();
                });
            });
        }

// Handle ingredient selection (removal)
function handleIngredientSelection(checkbox) {
    const ingredientId = checkbox.id;
    const ingredientCard = checkbox.closest('.ingredient-card');
    const ingredientName = ingredientCard.querySelector('.ingredient-name').textContent;
    
    // Extract the actual ingredient ID from the checkbox ID
    // Checkbox ID format: "remove_6879a1f70355e876dc25c9d9" -> extract "6879a1f70355e876dc25c9d9"
    const actualIngredientId = ingredientId.startsWith('remove_') ? ingredientId.substring(7) : ingredientId;

    console.log('Ingredient selection:', { 
        checkboxId: ingredientId, 
        actualId: actualIngredientId, 
        name: ingredientName, 
        checked: checkbox.checked 
    });

    if (checkbox.checked) {
        // Add to removed ingredients
        selectedAddons.push({
            id: actualIngredientId,
            checkboxId: ingredientId,
            name: ingredientName,
            price: 0, // No price change for removing ingredients
            action: 'remove'
        });
        ingredientCard.classList.add('selected');
    } else {
        // Remove from removed ingredients
        selectedAddons = selectedAddons.filter(ingredient => ingredient.checkboxId !== ingredientId);
        ingredientCard.classList.remove('selected');
    }
    
    console.log('Current removed ingredients:', selectedAddons);
}

// Handle addon selection (addition)
function handleAddonSelection(checkbox) {
    const addonId = checkbox.id;
    const addonCard = checkbox.closest('.addon-card-modern');
    const addonPrice = parseFloat(addonCard.dataset.price);
    const addonName = addonCard.querySelector('.addon-name').textContent;
    
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
            price: addonPrice,
            action: 'add'
        });
        addonCard.classList.add('selected');
    } else {
        selectedAddons = selectedAddons.filter(addon => addon.checkboxId !== addonId);
        addonCard.classList.remove('selected');
    }
    
    console.log('Current selected addons:', selectedAddons);
}



// Update modal total
function updateModalTotal() {
    if (!currentModalItem) return;

    const basePrice = currentModalItem.price;
    const quantity = parseInt(document.getElementById('modalQuantity').value) || 1;
    // Only add-ons with positive prices affect the total (removing ingredients doesn't change price)
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
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

// Format cart customizations (add-ons and removed ingredients)
function formatCartCustomizations(addons) {
    const addedItems = addons.filter(item => item.action === 'add' || !item.action);
    const removedItems = addons.filter(item => item.action === 'remove');
    
    let customizations = [];
    
    if (addedItems.length > 0) {
        customizations.push(`<span class="text-success">Add: ${addedItems.map(a => a.name).join(', ')}</span>`);
    }
    
    if (removedItems.length > 0) {
        customizations.push(`<span class="text-warning">Remove: ${removedItems.map(a => a.name).join(', ')}</span>`);
    }
    
    return customizations.join('<br>');
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
                            ${item.addons.length > 0 ? `<br>${formatCartCustomizations(item.addons)}` : ''}
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
        // Check if cart is empty
        if (cartItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Cart is empty',
                text: 'Please add items to cart first',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        // Check if we're in test mode or have authentication
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('test') === 'true';
        const hasAuth = isAuthenticated();

        if (testMode || !hasAuth) {
            // Use test endpoint for non-authenticated users
            await processTestOrder();
        } else {
            // Use regular sales endpoint for authenticated users
            await processRealOrder();
        }

    } catch (error) {
        console.error('Error processing order:', error);
        
        // Handle different types of errors
        let errorMessage = 'Failed to process order. Please try again.';
        
        if (error.message && error.message.includes('401')) {
            errorMessage = 'Authentication required. Please log in again.';
            // Redirect to login after showing error
            setTimeout(() => {
                redirectToLogin();
            }, 2000);
        } else if (error.message && error.message.includes('400')) {
            errorMessage = 'Invalid order data. Please check your cart.';
        } else if (error.message && error.message.includes('500')) {
            errorMessage = 'Server error. Please try again later.';
        } else if (error.message && error.message.includes('NetworkError') || error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please check your connection.';
        }

        Swal.fire({
            icon: 'error',
            title: 'Order Failed',
            text: errorMessage,
            confirmButtonColor: '#dc3545'
        });
    }
}

// Process test order (no authentication required)
async function processTestOrder() {
    const testOrderData = {
        items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            addons: item.addons.filter(addon => addon.action === 'add' || !addon.action).map(addon => ({
                name: addon.name,
                price: addon.price
            })),
            removedIngredients: item.addons.filter(addon => addon.action === 'remove').map(removed => ({
                name: removed.name,
                quantity: 1
            }))
        })),
        total: cartItems.reduce((sum, item) => sum + item.total, 0),
        paymentMethod: paymentMethod,
        serviceType: orderType
    };

    console.log('Sending test order data:', testOrderData);

    const response = await apiRequest('/sales/test-order', {
        method: 'POST',
        body: JSON.stringify(testOrderData)
    });

    console.log('Test order response:', response);

    // Handle successful test order
    Swal.fire({
        title: 'Test Order Completed!',
        text: `Successfully processed ${cartItems.length} items in test mode!`,
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
}

// Process real order (authentication required)
async function processRealOrder() {
        // Process each cart item as a separate sale
        const orderPromises = cartItems.map(async (item) => {
            // Separate add-ons and removed ingredients
            const actualAddOns = item.addons.filter(addon => addon.action === 'add' || !addon.action);
            const removedIngredients = item.addons.filter(addon => addon.action === 'remove');
            
            const orderData = {
                menuItem: item.id,
                quantity: item.quantity,
                addOns: actualAddOns.map(addon => ({
                    menuItem: addon.id, // This is now the actual ObjectId
                    quantity: 1
                })),
                removedIngredients: removedIngredients.map(removed => ({
                    inventoryItem: removed.name, // Use the ingredient name
                    name: removed.name,
                    quantity: 1 // For now, assume removing 1 unit of each ingredient
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
} 