// Check user authentication and role
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!user.role || user.role !== 'admin') {
  window.location.href = 'pos.html';
}

// Add test button for notifications (for development/testing)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Test notification button
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Notification';
  testButton.className = 'btn btn-warning btn-sm position-fixed';
  testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
  testButton.onclick = function() {
    showGlobalNotification('Test notification from Inventory!', 'warning');
  };
  document.body.appendChild(testButton);
  
  // Test inventory notification button
  const testInventoryButton = document.createElement('button');
  testInventoryButton.textContent = 'Test Inventory';
  testInventoryButton.className = 'btn btn-danger btn-sm position-fixed';
  testInventoryButton.style.cssText = 'bottom: 60px; right: 20px; z-index: 9999;';
  testInventoryButton.onclick = function() {
    testInventoryNotification();
  };
  document.body.appendChild(testInventoryButton);
}

// Pagination variables
let allIngredients = [];
let filteredIngredients = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize filteredIngredients as empty array to prevent undefined errors
if (!Array.isArray(filteredIngredients)) {
  filteredIngredients = [];
}

// Menu variables
let allMenuItems = [];
let filteredMenuItems = [];
let currentMenuPage = 1;
const menuItemsPerPage = 10;
let menuSortColumn = 'name';
let menuSortDirection = 'asc';

// Initialize filteredMenuItems as empty array to prevent undefined errors
if (!Array.isArray(filteredMenuItems)) {
  filteredMenuItems = [];
}

// Fetch inventory from backend and render in table - using config system
const API_URL = getApiUrl() + '/inventory/all';
const CREATE_URL = getApiUrl() + '/inventory/create';
const UPDATE_URL = getApiUrl() + '/inventory/update/';
const DELETE_URL = getApiUrl() + '/inventory/delete/';
const ADD_MENU_URL = getApiUrl() + '/menu/newMenu';

// Menu API URLs
const MENU_API_URL = getApiUrl() + '/menu/all';
const MENU_UPDATE_URL = getApiUrl() + '/menu/updateMenu/';
const MENU_DELETE_URL = getApiUrl() + '/menu/deleteMenu/';

// Helper function to get correct image URL from backend data
function getImageUrl(imagePath) {
  if (!imagePath) {
    console.warn('No image path provided, using default');
    return '../assets/ramen1.jpg'; // Default image only if no path
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /uploads/, it's a backend uploaded image
  if (imagePath.startsWith('/uploads/')) {
    return `${getUploadUrl()}${imagePath}`;
  }
  
  // If it's a relative path from backend (../assets/...), use it directly
  if (imagePath.startsWith('../assets/')) {
    return imagePath;
  }
  
  // If it's just a filename (like uploaded images from backend), construct backend URL
  if (!imagePath.includes('/') && imagePath.includes('.')) {
    const backendUrl = `${getUploadUrl()}/uploads/menus/${imagePath}`;
    console.log('Constructed backend image URL:', backendUrl);
    return backendUrl;
  }
  
  // If it's just a filename without extension, assume it's in assets
  if (!imagePath.includes('/')) {
    return `../assets/${imagePath}`;
  }
  
  // If it's any other path from backend, try to use it as is
  return imagePath;
}

// Threshold for low stock (admin-configurable, persisted via backend)
async function getLowStockThreshold() {
  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${getApiUrl()}/inventory/settings/low-stock-threshold`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const val = parseInt(data?.threshold ?? 10, 10);
    return isNaN(val) || val < 1 ? 10 : val;
  } catch {
    return 10;
  }
}

async function setLowStockThreshold(value) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) return false;
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${getApiUrl()}/inventory/settings/low-stock-threshold`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ threshold: num })
  });
  return res.ok;
}

function getStatusBadge(status, calculatedStatus, isOverridden) {
  // Use calculatedStatus if available, otherwise fall back to status
  const displayStatus = calculatedStatus || status;
  
  let badgeClass = 'bg-success';
  if (displayStatus === 'low stock') badgeClass = 'bg-warning text-dark';
  if (displayStatus === 'out of stock') badgeClass = 'bg-danger';
  
  let badge = `<span class="badge ${badgeClass}">${displayStatus}</span>`;
  
  // Add tooltip if status is overridden
  if (isOverridden && calculatedStatus && calculatedStatus !== status) {
    badge = `<span class="badge ${badgeClass}" title="Manual: ${status}, Calculated: ${calculatedStatus}">${displayStatus}</span>`;
  }
  
  return badge;
}

function renderIngredientsTableWithPagination(ingredients = filteredIngredients) {
  const tbody = document.getElementById('ingredientsTableBody');
  if (!tbody) return;

  // Ensure ingredients is an array and use filteredIngredients as fallback
  if (!Array.isArray(ingredients)) {
    console.error('renderIngredientsTableWithPagination: ingredients is not an array:', ingredients);
    ingredients = Array.isArray(filteredIngredients) ? filteredIngredients : [];
  }

  const totalPages = Math.ceil(ingredients.length / itemsPerPage);
  
  // Calculate start and end indices for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIngredients = ingredients.slice(startIndex, endIndex);
  
  if (currentIngredients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="fas fa-inbox fa-2x mb-2"></i>
          <div>No ingredients found</div>
        </td>
      </tr>
    `;
    updateInventoryPagination(0, 0);
    return;
  }

  tbody.innerHTML = currentIngredients.map(ingredient => `
    <tr>
      <td>${ingredient.name}</td>
      <td>${ingredient.stocks}</td>
      <td>${ingredient.units}</td>
      <td>${ingredient.restocked ? new Date(ingredient.restocked).toLocaleDateString() : ''}</td>
      <td>${getStatusBadge(ingredient.status, ingredient.calculatedStatus, ingredient.isStatusOverridden)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1 edit-btn" data-id="${ingredient._id}"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${ingredient._id}"><i class="fas fa-trash"></i> Delete</button>
      </td>
    </tr>
  `).join('');

  // Attach event listeners for edit and delete
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => openEditModal(e.target.closest('button').dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleDelete(e.target.closest('button').dataset.id));
  });

  // Update pagination controls
  updateInventoryPagination(totalPages, ingredients.length);
}

function updateInventoryPagination(totalPages, totalItems) {
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  
  if (!prevBtn || !nextBtn || !pageInfo) return;

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Update page info
  pageInfo.textContent = `Page ${currentPage} of ${totalPages} (Showing ${startItem} to ${endItem} of ${totalItems} ingredients)`;

  // Update button states
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  // Update button styles
  if (currentPage === 1) {
    prevBtn.classList.add('disabled');
  } else {
    prevBtn.classList.remove('disabled');
  }

  if (currentPage === totalPages) {
    nextBtn.classList.add('disabled');
  } else {
    nextBtn.classList.remove('disabled');
  }
}

function changeInventoryPage(page) {
  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderIngredientsTableWithPagination(filteredIngredients);
  }
}

// Function to update summary cards
function updateSummaryCards(ingredients, menuItems = []) {
  if (!ingredients || !Array.isArray(ingredients)) {
    console.warn('Invalid ingredients data for summary cards');
    return;
  }

  const totalIngredients = ingredients.length;
  const outOfStock = ingredients.filter(ingredient => 
    ingredient.stocks <= 0 || ingredient.calculatedStatus === 'out of stock'
  ).length;
  // Use calculatedStatus provided by backend; also compute via threshold for safety
  let threshold = 10;
  try { threshold = parseInt(localStorage.getItem('cachedLowStockThreshold') || '10', 10) || 10; } catch {}
  const lowStock = ingredients.filter(ingredient => {
    // If stocks is 0 or negative, it should be out of stock, not low stock
    if (ingredient.stocks <= 0) return false;
    // Use calculatedStatus if available, otherwise check against threshold
    return ingredient.calculatedStatus === 'low stock' || (ingredient.stocks > 0 && ingredient.stocks <= threshold);
  }).length;
  const totalMenu = menuItems.length;

  // Update the summary card values with updated selectors for 4 cards
  // Order: 1. Total Ingredients, 2. Total Menu, 3. Out of Stock, 4. Low Stock
  const totalElement = document.querySelector('.col-12.col-sm-6.col-lg-3:nth-child(1) .fs-5.fw-bold');
  const totalMenuElement = document.querySelector('.col-12.col-sm-6.col-lg-3:nth-child(2) .fs-5.fw-bold');
  const outOfStockElement = document.querySelector('.col-12.col-sm-6.col-lg-3:nth-child(3) .fs-5.fw-bold');
  const lowStockElement = document.querySelector('.col-12.col-sm-6.col-lg-3:nth-child(4) .fs-5.fw-bold');

  if (totalElement) {
    totalElement.textContent = totalIngredients;
  } else {
    console.warn('Total ingredients element not found');
  }

  if (totalMenuElement) {
    totalMenuElement.textContent = totalMenu;
  } else {
    console.warn('Total menu element not found');
  }
  
  if (outOfStockElement) {
    outOfStockElement.textContent = outOfStock;
  } else {
    console.warn('Out of stock element not found');
  }
  
  if (lowStockElement) {
    lowStockElement.textContent = lowStock;
  } else {
    console.warn('Low stock element not found');
  }

  console.log('Summary cards updated:', { totalIngredients, outOfStock, lowStock, totalMenu });
}

async function fetchInventory() {
  const token = localStorage.getItem('authToken');
  const tbody = document.getElementById('ingredientsTableBody');
  if (!token) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-danger">You must be logged in to view inventory.</td></tr>';
    return;
  }

  // Show loading state
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2">Loading ingredients...</div>
        </td>
      </tr>
    `;
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch inventory');
    const data = await response.json();
    const ingredients = Array.isArray(data) ? data : data.data || [];
    
    // Store all ingredients and initialize filtered ingredients
    allIngredients = ingredients;
    filteredIngredients = [...ingredients];
    
    // Reset to first page
    currentPage = 1;
    
    // Fetch menu items for summary cards
    try {
      const menuResponse = await fetch(MENU_API_URL);
      const menuData = await menuResponse.json();
      const menuItems = Array.isArray(menuData) ? menuData : menuData.data || [];
      
      // Update summary cards with both ingredients and menu data
      updateSummaryCards(ingredients, menuItems);
    } catch (menuError) {
      console.warn('Failed to fetch menu items for summary cards:', menuError);
      // Update summary cards with just ingredients data
      updateSummaryCards(ingredients, []);
    }
    
    renderIngredientsTableWithPagination(filteredIngredients);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-danger">Failed to load inventory data.</td></tr>';
    
    // Update summary cards with error state
    updateSummaryCards([]);
  }
}

// Modal and form logic
let addIngredientModal;
let addMenuModal;
document.addEventListener('DOMContentLoaded', () => {
  // Initialize summary cards with loading state
  updateSummaryCards([]);
  
  fetchInventory();
  initializeTabListeners();
  setupMenuSorting();

  // Initialize Low Stock Settings modal and wire to backend
  const openSettingsBtn = document.getElementById('openLowStockThresholdModal');
  const settingsModalEl = document.getElementById('lowStockSettingsModal');
  const thresholdInputModal = document.getElementById('lowStockThresholdInputModal');
  const saveBtnModal = document.getElementById('saveLowStockThresholdBtnModal');
  const errorDiv = document.getElementById('lowStockSettingsError');

  if (openSettingsBtn && settingsModalEl) {
    const settingsModal = new bootstrap.Modal(settingsModalEl);
    openSettingsBtn.addEventListener('click', async () => {
      errorDiv && (errorDiv.style.display = 'none');
      const threshold = await getLowStockThreshold();
      localStorage.setItem('cachedLowStockThreshold', String(threshold));
      if (thresholdInputModal) thresholdInputModal.value = threshold;
      settingsModal.show();
    });

    if (saveBtnModal) {
      saveBtnModal.addEventListener('click', async () => {
        const value = thresholdInputModal?.value;
        const ok = await setLowStockThreshold(value);
        if (ok) {
          localStorage.setItem('cachedLowStockThreshold', String(value));
          // Refresh data to get recalculated statuses from backend
          await fetchInventory();
          settingsModal.hide();
          Swal.fire('Saved', 'Low stock threshold updated.', 'success');
        } else {
          if (errorDiv) {
            errorDiv.textContent = 'Invalid value. Please enter a number ≥ 1.';
            errorDiv.style.display = 'block';
          }
        }
      });
    }
  }

  // Add pagination event listeners
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => changeInventoryPage(currentPage - 1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => changeInventoryPage(currentPage + 1));
  }

  // Bootstrap modal instance for add
  const modalEl = document.getElementById('addIngredientModal');
  if (modalEl) {
    addIngredientModal = new bootstrap.Modal(modalEl);
  }

  // Open modal on button click
  const addBtn = document.getElementById('addIngredientBtn');
  if (addBtn && addIngredientModal) {
    addBtn.addEventListener('click', () => {
      document.getElementById('addIngredientForm').reset();
      // Set today's date as default for restock date
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('ingredientRestocked').value = today;
      document.getElementById('addIngredientError').style.display = 'none';
      addIngredientModal.show();
    });
  }

  // Handle add form submit
  const form = document.getElementById('addIngredientForm');
  if (form) {
    // Add event listener for stock quantity changes to suggest status
    const stocksInput = document.getElementById('ingredientStocks');
    const statusSelect = document.getElementById('ingredientStatus');
    if (stocksInput && statusSelect) {
      stocksInput.addEventListener('input', (e) => {
        const stocks = parseInt(e.target.value) || 0;
        let suggestedStatus = 'in stock';
        if (stocks <= 0) suggestedStatus = 'out of stock';
        else {
          let threshold = 10; try { threshold = parseInt(localStorage.getItem('cachedLowStockThreshold') || '10', 10) || 10; } catch {}
          if (stocks <= threshold) suggestedStatus = 'low stock';
        }
        
        // Set as default if no status is selected yet
        if (!statusSelect.value || statusSelect.value === 'in stock') {
          statusSelect.value = suggestedStatus;
        }
        
        // Show suggestion
        statusSelect.title = `Calculated: ${suggestedStatus}`;
      });
    }
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('authToken');
      if (!token) {
        document.getElementById('addIngredientError').textContent = 'You must be logged in.';
        document.getElementById('addIngredientError').style.display = 'block';
        return;
      }
      const formData = new FormData(form);
      const body = {};
      formData.forEach((value, key) => {
        // Skip restocked field as it's set automatically by backend
        if (key !== 'restocked') {
          body[key] = value;
        }
      });
      try {
        const response = await fetch(CREATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add ingredient');
        }
        addIngredientModal.hide();
        fetchInventory();
        Swal.fire('Success', 'Ingredient added successfully!', 'success');
      } catch (err) {
        document.getElementById('addIngredientError').textContent = err.message;
        document.getElementById('addIngredientError').style.display = 'block';
      }
    });
  }

  // Handle edit form submit (moved inside DOMContentLoaded)
  const editForm = document.getElementById('editIngredientForm');
  if (editForm) {
    // Add event listener for stock quantity changes to suggest status
    const stocksInput = document.getElementById('editIngredientStocks');
    const statusSelect = document.getElementById('editIngredientStatus');
    if (stocksInput && statusSelect) {
      stocksInput.addEventListener('input', (e) => {
        const stocks = parseInt(e.target.value) || 0;
        let suggestedStatus = 'in stock';
        if (stocks <= 0) suggestedStatus = 'out of stock';
        else {
          let threshold = 10; try { threshold = parseInt(localStorage.getItem('cachedLowStockThreshold') || '10', 10) || 10; } catch {}
          if (stocks <= threshold) suggestedStatus = 'low stock';
        }
        
        // Show suggestion and update the select value
        statusSelect.title = `Calculated: ${suggestedStatus}`;
        statusSelect.value = suggestedStatus;
        
        // Add visual indicator for status change
        const statusLabel = document.querySelector('label[for="editIngredientStatus"]');
        if (statusLabel) {
          const currentStatus = statusSelect.value;
          if (currentStatus === 'out of stock') {
            statusLabel.innerHTML = 'Status <span class="text-danger">(Will be out of stock)</span>';
          } else if (currentStatus === 'low stock') {
            statusLabel.innerHTML = 'Status <span class="text-warning">(Will be low stock)</span>';
          } else {
            statusLabel.innerHTML = 'Status <span class="text-success">(Will be in stock)</span>';
          }
        }
        
        // Don't show notifications on input - only show when form is submitted
      });
    }
    
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('authToken');
      if (!token) {
        document.getElementById('editIngredientError').textContent = 'You must be logged in.';
        document.getElementById('editIngredientError').style.display = 'block';
        return;
      }
      const id = document.getElementById('editIngredientId').value;
      const body = {
        name: document.getElementById('editIngredientName').value,
        stocks: document.getElementById('editIngredientStocks').value,
        units: document.getElementById('editIngredientUnits').value,
        status: document.getElementById('editIngredientStatus').value
        // restocked is set automatically by backend
      };
      try {
        const response = await fetch(UPDATE_URL + id, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update ingredient');
        }
        // Notifications are now handled by the backend and sent via Socket.IO
        // No need to show notifications here as they will be received from the backend
        
        // Hide the modal after successful edit
        const modalEl = document.getElementById('editIngredientModal');
        const editModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        editModal.hide();
        // Show success message first and wait for user to close it
        await Swal.fire({
          title: 'Success',
          text: 'Ingredient updated successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        fetchInventory();
      } catch (err) {
        document.getElementById('editIngredientError').textContent = err.message;
        document.getElementById('editIngredientError').style.display = 'block';
      }
    });
  }

  // Bootstrap modal instance for add menu
  const menuModalEl = document.getElementById('addMenuModal');
  if (menuModalEl) {
    addMenuModal = new bootstrap.Modal(menuModalEl);
  }

  // Open add menu modal on button click
  const addMenuBtn = document.getElementById('addMenuBtn');
  if (addMenuBtn && addMenuModal) {
    addMenuBtn.addEventListener('click', async () => {
      document.getElementById('addMenuForm').reset();
      document.getElementById('addMenuError').style.display = 'none';
      
      // Populate ingredients list
      await populateIngredientsList();
      
      addMenuModal.show();
    });
  }

  // Handle add menu form submit
  const addMenuForm = document.getElementById('addMenuForm');
  if (addMenuForm) {
    addMenuForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get form values manually to ensure they're properly set
      const name = document.getElementById('menuName').value;
      const price = document.getElementById('menuPrice').value;
      const category = document.getElementById('menuCategory').value;
      const imageFile = document.getElementById('menuImage').files[0];
      
      console.log('Form values:', { name, price, category, imageFile });
      
      // Validate required fields
      if (!name || !price || !category) {
        document.getElementById('addMenuError').textContent = 'Please fill in all required fields';
        document.getElementById('addMenuError').style.display = 'block';
        return;
      }
      
      if (!imageFile) {
        document.getElementById('addMenuError').textContent = 'Please select an image file';
        document.getElementById('addMenuError').style.display = 'block';
        return;
      }
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', parseFloat(price));
      formData.append('category', category);
      formData.append('image', imageFile);
      
      console.log('Added image file to FormData:', imageFile.name);
      
      // Get selected ingredients first
      const selectedIngredients = [];
      document.querySelectorAll('.ingredient-checkbox:checked').forEach(checkbox => {
        const ingredientId = checkbox.value;
        const quantityInput = document.getElementById(`quantity_input_${ingredientId}`);
        const quantity = quantityInput ? parseFloat(quantityInput.value) || 1 : 1;
        
        selectedIngredients.push({
          name: checkbox.dataset.name,
          quantity: quantity,
          unit: checkbox.dataset.units
        });
      });
      
      // Add ingredients to form data
      formData.append('ingredients', JSON.stringify(selectedIngredients));
      
      try {
        console.log('Submitting add menu form...');
        console.log('FormData contents:', Array.from(formData.entries()));
        console.log('FormData keys:', Array.from(formData.keys()));
        console.log('FormData values:', Array.from(formData.values()));
        
        const response = await fetch(ADD_MENU_URL, {
          method: 'POST',
          body: formData, // Use actual FormData with file
          // Don't set Content-Type for FormData, let browser set it with boundary
        });
        
        console.log('Add menu response status:', response.status);
        console.log('Add menu response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          console.error('Response status:', response.status);
          console.error('Response statusText:', response.statusText);
          console.error('Response headers:', response.headers);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Add menu response data:', data);
        
        if (data.success === false) {
          throw new Error(data.message || 'Failed to add menu item');
        }
        
        // Hide modal first
        addMenuModal.hide();
        
        // Store that Menu tab should be active after reload
        localStorage.setItem('activeInventoryTab', 'menu-tab');
        
        // Add a small delay to ensure modal is fully hidden before showing SweetAlert
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Show success message and wait for user to click OK
        console.log('About to show SweetAlert for add menu...');
        
        // Show SweetAlert and wait for user to click OK
        const result = await Swal.fire({
          title: 'Success',
          text: 'Menu item added successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          allowEscapeKey: false
        });
        
        console.log('SweetAlert result:', result);
        
        // Only reload if user clicked OK
        if (result.isConfirmed) {
          console.log('User confirmed, reloading page...');
          window.location.reload();
        }
      } catch (err) {
        console.error('Add menu error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        document.getElementById('addMenuError').textContent = err.message;
        document.getElementById('addMenuError').style.display = 'block';
      }
    });
  }
});

// Open edit modal and populate fields
async function openEditModal(id) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    Swal.fire('Error', 'You must be logged in.', 'error');
    return;
  }
  try {
            const res = await fetch(`${getApiUrl()}/inventory/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ingredient = await res.json();
    if (!res.ok || ingredient.error || ingredient.message) {
      throw new Error(ingredient.error || ingredient.message || 'Failed to fetch ingredient');
    }
    document.getElementById('editIngredientId').value = ingredient._id;
    document.getElementById('editIngredientName').value = ingredient.name;
    document.getElementById('editIngredientStocks').value = ingredient.stocks;
    document.getElementById('editIngredientUnits').value = ingredient.units;
    // Show current restock date but it will be updated automatically
    document.getElementById('editIngredientRestocked').value = ingredient.restocked ? new Date(ingredient.restocked).toISOString().split('T')[0] : '';
    document.getElementById('editIngredientStatus').value = ingredient.status || 'in stock';
    
    // Show calculated status as tooltip
    const statusSelect = document.getElementById('editIngredientStatus');
    if (ingredient.calculatedStatus) {
      statusSelect.title = `Calculated: ${ingredient.calculatedStatus}`;
    }
    document.getElementById('editIngredientError').style.display = 'none';
    // Always create a new modal instance and show it
    const modalEl = document.getElementById('editIngredientModal');
    const editModal = new bootstrap.Modal(modalEl);
    editModal.show();
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}

// Populate ingredients list for menu creation
async function populateIngredientsList() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  
  try {
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch ingredients');
    const data = await response.json();
    const ingredients = Array.isArray(data) ? data : data.data || [];
    
    const ingredientsList = document.getElementById('ingredientsList');
    if (!ingredientsList) return;
    
    ingredientsList.innerHTML = ingredients.map(ingredient => `
      <div class="col-md-6 mb-2">
        <div class="form-check">
          <input class="form-check-input ingredient-checkbox" type="checkbox" 
                 id="ingredient_${ingredient._id}" value="${ingredient._id}" 
                 data-name="${ingredient.name}" data-units="${ingredient.units}">
          <label class="form-check-label" for="ingredient_${ingredient._id}">
            <strong>${ingredient.name}</strong>
            <br>
            <small class="text-muted">
              Stock: ${ingredient.stocks} ${ingredient.units} 
              <span class="badge ${(ingredient.calculatedStatus || ingredient.status) === 'in stock' ? 'bg-success' : (ingredient.calculatedStatus || ingredient.status) === 'low stock' ? 'bg-warning' : 'bg-danger'} ms-1">
                ${ingredient.calculatedStatus || ingredient.status}
              </span>
            </small>
          </label>
          <div class="mt-2" id="quantity_${ingredient._id}" style="display: none;">
            <div class="input-group input-group-sm">
              <input type="number" class="form-control quantity-input" 
                     id="quantity_input_${ingredient._id}" 
                     placeholder="Quantity" min="0.1" step="0.1" value="1">
              <span class="input-group-text">${ingredient.units}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for quantity inputs
    ingredients.forEach(ingredient => {
      const checkbox = document.getElementById(`ingredient_${ingredient._id}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          const quantityInput = document.getElementById(`quantity_${ingredient._id}`);
          if (quantityInput) {
            quantityInput.style.display = isChecked ? 'block' : 'none';
            if (!isChecked) quantityInput.value = '';
          }
        });
      }
    });
    
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    const ingredientsList = document.getElementById('ingredientsList');
    if (ingredientsList) {
      ingredientsList.innerHTML = '<div class="col-12 text-danger">Failed to load ingredients</div>';
    }
  }
}

// Handle delete
async function handleDelete(id) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'This will permanently delete the ingredient.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const response = await fetch(DELETE_URL + id, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete ingredient');
        }
        
        // Refresh inventory and maintain current page if possible
        await fetchInventory();
        
        // If current page is now empty, go to previous page
        const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
          currentPage = totalPages;
          renderIngredientsTableWithPagination(filteredIngredients);
        }
        
        await Swal.fire({
          title: 'Deleted!',
          text: 'Ingredient has been deleted.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  });
}

// ==================== MENU MANAGEMENT FUNCTIONS ====================

// Fetch menu items from backend
async function fetchMenuItems() {
  try {
    const response = await fetch(MENU_API_URL);
    const data = await response.json();
    
    if (response.ok) {
      allMenuItems = data.data || data;
      filteredMenuItems = [...allMenuItems];
      
      // Apply sorting
      sortMenuItems();
      
      // Update summary cards with menu data
      updateSummaryCards(allIngredients, allMenuItems);
      
      renderMenuTableWithPagination(filteredMenuItems);
    } else {
      throw new Error(data.message || 'Failed to fetch menu items');
    }
  } catch (error) {
    console.error('Error fetching menu items:', error);
    document.getElementById('menuTableBody').innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">
          <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
          <div>Error loading menu items: ${error.message}</div>
        </td>
      </tr>
    `;
  }
}

// Render menu table with pagination
function renderMenuTableWithPagination(menuItems = filteredMenuItems) {
  const tbody = document.getElementById('menuTableBody');
  if (!tbody) return;

  // Ensure menuItems is an array and use filteredMenuItems as fallback
  if (!Array.isArray(menuItems)) {
    console.error('renderMenuTableWithPagination: menuItems is not an array:', menuItems);
    menuItems = Array.isArray(filteredMenuItems) ? filteredMenuItems : [];
  }

  const totalPages = Math.ceil(menuItems.length / menuItemsPerPage);
  
  // Calculate start and end indices for current page
  const startIndex = (currentMenuPage - 1) * menuItemsPerPage;
  const endIndex = startIndex + menuItemsPerPage;
  const currentMenuItems = menuItems.slice(startIndex, endIndex);
  
  if (currentMenuItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          <i class="fas fa-utensils fa-2x mb-2"></i>
          <div>No menu items found</div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = currentMenuItems.map(item => `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            ${item.image ? `<img src="${getImageUrl(item.image)}" alt="${item.name}" class="rounded me-2" style="width: 40px; height: 40px; object-fit: cover;" onerror="this.src='../assets/ramen1.jpg'">` : ''}
            <div>
              <div class="fw-bold">${item.name}</div>
              ${item.description ? `<small class="text-muted">${item.description}</small>` : ''}
            </div>
          </div>
        </td>
        <td><span class="badge bg-secondary">${item.category || 'N/A'}</span></td>
        <td><span class="fw-bold text-success">₱${item.price || '0.00'}</span></td>
        <td>
          <span class="badge bg-info">
            ${item.ingredients && item.ingredients.length > 0 
              ? `${item.ingredients.length} ingredient${item.ingredients.length !== 1 ? 's' : ''}`
              : '0 ingredients'}
          </span>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-info me-2" onclick="viewMenuItem('${item._id}')" title="View">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning me-2" onclick="editMenuItem('${item._id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger me-2" onclick="deleteMenuItem('${item._id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  // Update pagination info
  document.getElementById('menuPageInfo').textContent = `Page ${currentMenuPage} of ${totalPages}`;
  
  // Update pagination buttons
  document.getElementById('menuPrevPage').disabled = currentMenuPage === 1;
  document.getElementById('menuNextPage').disabled = currentMenuPage === totalPages || totalPages === 0;
}

// Edit menu item
async function editMenuItem(id) {
  try {
    // Fetch menu item details
    const response = await fetch(`${getApiUrl()}/menu/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch menu item details');
    }

    const data = await response.json();
    const menuItem = data.data;
    
    console.log('Menu item data received for editing:', menuItem);
    console.log('Ingredients data:', menuItem.ingredients);

    // Create modern edit form HTML
    const editForm = `
      <form id="editMenuForm">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="form-floating">
              <input type="text" class="form-control" id="editMenuName" value="${menuItem.name}" placeholder="Menu Name" required>
              <label for="editMenuName" class="form-label">
                <i class="fas fa-utensils me-2 text-primary"></i>Menu Name
              </label>
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-floating">
              <input type="number" class="form-control" id="editMenuPrice" value="${menuItem.price}" step="0.01" placeholder="Price" required>
              <label for="editMenuPrice" class="form-label">
                <i class="fas fa-tag me-2 text-success"></i>Price (₱)
              </label>
            </div>
          </div>
        </div>
        
        <div class="row g-3 mt-2">
          <div class="col-md-6">
            <div class="form-floating">
              <select class="form-select" id="editMenuCategory" required>
                <option value="">Choose category...</option>
                <option value="ramen" ${menuItem.category === 'ramen' ? 'selected' : ''}>🍜 Ramen</option>
                <option value="ricebowl" ${menuItem.category === 'ricebowl' ? 'selected' : ''}>🍚 Rice Bowl</option>
                <option value="sides" ${menuItem.category === 'sides' ? 'selected' : ''}>🥢 Sides</option>
                <option value="drinks" ${menuItem.category === 'drinks' ? 'selected' : ''}>🥤 Drinks</option>
              </select>
              <label for="editMenuCategory" class="form-label">
                <i class="fas fa-folder me-2 text-info"></i>Category
              </label>
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="editMenuImage" class="form-label">
                <i class="fas fa-image me-2 text-warning"></i>Image
              </label>
              <div class="input-group">
                <input type="text" class="form-control" id="editMenuImage" value="${menuItem.image || ''}" placeholder="Image URL">
                <input type="file" class="form-control" id="editMenuImageFile" accept="image/*" style="display: none;" onchange="window.handleImageFileSelect(event)">
                <button class="btn btn-outline-secondary" type="button" onclick="window.toggleImageInput()">
                  <i class="fas fa-upload"></i>
                </button>
              </div>
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>Enter URL or click upload to choose file
              </small>
            </div>
          </div>
        </div>
        
        <div class="mt-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold text-dark mb-0">
              <i class="fas fa-list me-2 text-primary"></i>Ingredients
            </h6>
            <button type="button" class="btn btn-primary btn-sm rounded-pill" onclick="addEditIngredient()">
              <i class="fas fa-plus me-1"></i>Add Ingredient
            </button>
          </div>
          <div id="editIngredientsList" class="bg-light rounded-3 p-3" style="max-height: 250px; overflow-y: auto; border: 2px dashed #dee2e6;">
            ${menuItem.ingredients && menuItem.ingredients.length > 0 
              ? menuItem.ingredients.map((ing, index) => `
                  <div class="card mb-2 edit-ingredient-row" data-index="${index}">
                    <div class="card-body p-2">
                      <div class="row g-2 align-items-center">
                        <div class="col-md-7">
                          <select class="form-select form-select-sm" name="ingredient_${index}" required>
                            <option value="">Select ingredient...</option>
                          </select>
                        </div>
              <div class="col-md-4">
                <input type="number" class="form-control form-control-sm" name="quantity_${index}" value="${ing.quantity}" placeholder="Quantity" step="0.1" min="0.1" required>
              </div>
                        <div class="col-md-1">
                          <button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="removeEditIngredient(this)" title="Remove ingredient">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')
              : '<div class="text-center text-muted py-4"><i class="fas fa-plus-circle fa-2x mb-2"></i><br>No ingredients added yet</div>'
            }
          </div>
        </div>
        
        <div id="editMenuError" class="alert alert-danger mt-3" style="display: none;">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <span class="error-message"></span>
        </div>
      </form>
    `;

    // Show edit modal
    const result = await Swal.fire({
      title: 'Edit Menu Item',
      html: editForm,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      width: '600px',
      didOpen: async () => {
        // Populate ingredient selects after modal opens
        await populateAllEditIngredientSelects();
        
        // Set current ingredient selections
        const selects = document.querySelectorAll('#editIngredientsList select[name^="ingredient_"]');
        selects.forEach((select, index) => {
          const currentIngredient = menuItem.ingredients[index];
          if (currentIngredient) {
            console.log(`Setting ingredient ${index}:`, currentIngredient);
            
            // inventoryItem is the name, not ID - we need to find the matching option by name
            const ingredientName = currentIngredient.inventoryItem;
            console.log(`Ingredient name for ${index}:`, ingredientName);
            
            if (ingredientName) {
              // Wait a bit for options to be populated
              setTimeout(() => {
                // Find the option that matches the ingredient name
                const options = select.querySelectorAll('option');
                let matchingOption = null;
                
                for (const option of options) {
                  if (option.textContent.includes(ingredientName)) {
                    matchingOption = option;
                    break;
                  }
                }
                
                if (matchingOption) {
                  select.value = matchingOption.value;
                  console.log(`Set select value to: ${matchingOption.value} for ingredient: ${ingredientName}`);
                } else {
                  console.log(`No matching option found for ingredient: ${ingredientName}`);
                }
              }, 200);
            }
          }
        });
        
        // No unit auto-fill needed since we removed units
      },
      preConfirm: async () => {
        const name = document.getElementById('editMenuName').value;
        const price = document.getElementById('editMenuPrice').value;
        const category = document.getElementById('editMenuCategory').value;
        const urlInput = document.getElementById('editMenuImage');
        const fileInput = document.getElementById('editMenuImageFile');
        
        // Get image value (either URL or file)
        let image = '';
        let useFormData = false;
        let formData = new FormData();
        
        if (urlInput.style.display !== 'none') {
          image = urlInput.value;
          console.log('Using URL input, image value:', image);
        } else if (fileInput.files && fileInput.files[0]) {
          // File upload - use FormData
          useFormData = true;
          formData.append('image', fileInput.files[0]);
          console.log('Using file upload:', fileInput.files[0].name);
        }

        if (!name || !price || !category) {
          Swal.showValidationMessage('Please fill in all required fields');
          return false;
        }

        try {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('price', parseFloat(price));
          formData.append('category', category);

          // Handle image: either a file or a URL string
          if (fileInput.files && fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
            console.log('Appending image file to FormData:', fileInput.files[0].name);
          } else {
            formData.append('image', image);
            console.log('Appending image URL to FormData:', image);
          }

          // Collect ingredients from the form
          const ingredients = [];
          const ingredientRows = document.querySelectorAll('#editIngredientsList .edit-ingredient-row');
          ingredientRows.forEach(row => {
            const select = row.querySelector('select[name^="ingredient_"]');
            const quantityInput = row.querySelector('input[name^="quantity_"]');
            
            if (select && select.value && quantityInput && quantityInput.value) {
              // Get the ingredient name from the selected option text
              const selectedOption = select.querySelector(`option[value="${select.value}"]`);
              const ingredientName = selectedOption ? selectedOption.textContent.split(' (')[0] : select.value;
              
              ingredients.push({
                inventoryItem: ingredientName,
                quantity: parseFloat(quantityInput.value) || 1
              });
              
              console.log('Added ingredient:', {
                inventoryItem: ingredientName,
                quantity: parseFloat(quantityInput.value) || 1
              });
            }
          });
          
          console.log('All ingredients to send:', ingredients);
          formData.append('ingredients', JSON.stringify(ingredients));

          console.log('Sending FormData for menu update...');
          const updateResponse = await fetch(`${MENU_UPDATE_URL}${id}`, {
            method: 'PUT',
            body: formData, // FormData sets its own Content-Type header
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'Failed to update menu item');
          }

          return true;
        } catch (error) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      }
    });

    if (result.isConfirmed) {
      localStorage.setItem('activeInventoryTab', 'menu-tab');
      
      await Swal.fire({
        title: 'Success',
        text: 'Menu item updated successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.reload();
      });
    }
  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  }
}

// Helper function to remove ingredient from edit form
function removeEditIngredient(button) {
  button.parentElement.remove();
  updateEditIngredientIndices();
}

// Helper function to add new ingredient row
function addEditIngredient() {
  const ingredientsList = document.getElementById('editIngredientsList');
  if (!ingredientsList) return;
  
  const currentRows = ingredientsList.querySelectorAll('.edit-ingredient-row').length;
  const newIndex = currentRows;
  
  const newRow = document.createElement('div');
  newRow.className = 'card mb-2 edit-ingredient-row';
  newRow.setAttribute('data-index', newIndex);
  newRow.innerHTML = `
    <div class="card-body p-2">
      <div class="row g-2 align-items-center">
        <div class="col-md-7">
          <select class="form-select form-select-sm" name="ingredient_${newIndex}" required>
            <option value="">Select ingredient...</option>
          </select>
        </div>
        <div class="col-md-4">
          <input type="number" class="form-control form-control-sm" name="quantity_${newIndex}" placeholder="Quantity" step="0.1" min="0.1" required>
        </div>
        <div class="col-md-1">
          <button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="removeEditIngredient(this)" title="Remove ingredient">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Remove the "no ingredients" message if it exists
  const noIngredientsMsg = ingredientsList.querySelector('p.text-muted');
  if (noIngredientsMsg) {
    noIngredientsMsg.remove();
  }
  
  ingredientsList.appendChild(newRow);
  
  // Populate the select with available ingredients
  populateEditIngredientSelect(newRow.querySelector('select'));
  
  // No unit auto-fill needed since we removed units
}

// Helper function to update ingredient row indices after removal
function updateEditIngredientIndices() {
  const ingredientsList = document.getElementById('editIngredientsList');
  if (!ingredientsList) return;
  
  const rows = ingredientsList.querySelectorAll('.edit-ingredient-row');
  rows.forEach((row, index) => {
    row.setAttribute('data-index', index);
    const select = row.querySelector('select');
    const quantityInput = row.querySelector('input[type="number"]');
    const unitInput = row.querySelector('input[type="text"]');
    
    if (select) select.name = `ingredient_${index}`;
    if (quantityInput) quantityInput.name = `quantity_${index}`;
    if (unitInput) unitInput.name = `unit_${index}`;
  });
  
  // Show "no ingredients" message if no rows left
  if (rows.length === 0) {
    ingredientsList.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-plus-circle fa-2x mb-2"></i><br>No ingredients added yet</div>';
  }
}

// Helper function to populate ingredient select dropdown
async function populateEditIngredientSelect(selectElement) {
  if (!selectElement) return;
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${getApiUrl()}/inventory/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const ingredients = Array.isArray(data) ? data : data.data || [];
      
      // Clear existing options except the first one
      selectElement.innerHTML = '<option value="">Select ingredient...</option>';
      
      ingredients.forEach(ingredient => {
        const option = document.createElement('option');
        option.value = ingredient._id;
        option.textContent = `${ingredient.name} (${ingredient.stocks} ${ingredient.units})`;
        option.dataset.unit = ingredient.units;
        selectElement.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching ingredients:', error);
  }
}

// Helper function to populate all ingredient selects in edit form
async function populateAllEditIngredientSelects() {
  const selects = document.querySelectorAll('#editIngredientsList select[name^="ingredient_"]');
  for (const select of selects) {
    await populateEditIngredientSelect(select);
  }
}

// Toggle between URL input and file input
function toggleImageInput() {
  const urlInput = document.getElementById('editMenuImage');
  const fileInput = document.getElementById('editMenuImageFile');
  const uploadBtn = document.querySelector('button[onclick*="toggleImageInput"]');
  
  if (!urlInput || !fileInput || !uploadBtn) {
    console.error('Required elements not found for toggleImageInput');
    return;
  }
  
  if (urlInput.style.display === 'none') {
    // Show URL input
    urlInput.style.display = 'block';
    fileInput.style.display = 'none';
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i>';
    uploadBtn.title = 'Switch to file upload';
  } else {
    // Show file input
    urlInput.style.display = 'none';
    fileInput.style.display = 'block';
    uploadBtn.innerHTML = '<i class="fas fa-link"></i>';
    uploadBtn.title = 'Switch to URL input';
  }
}

// Handle file selection
function handleImageFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    // Convert file to data URL for preview
    const reader = new FileReader();
    reader.onload = function(e) {
      // You could show a preview here if needed
      console.log('File selected:', file.name);
    };
    reader.readAsDataURL(file);
  }
}

// View menu item details
async function viewMenuItem(id) {
  try {
    // Fetch menu item details
    const response = await fetch(`${getApiUrl()}/menu/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch menu item details');
    }

    const data = await response.json();
    const menuItem = data.data;

    // Create view modal HTML
    const viewModal = `
      <div class="modal fade" id="viewMenuModal" tabindex="-1" aria-labelledby="viewMenuModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title" id="viewMenuModalLabel">
                <i class="fas fa-utensils me-2"></i>Menu Item Details
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-4">
                  <div class="text-center mb-3">
                    ${menuItem.image ? 
                      `<img src="${getImageUrl(menuItem.image)}" alt="${menuItem.name}" class="img-fluid rounded" style="max-height: 200px; object-fit: cover;" onerror="this.src='../assets/ramen1.jpg'">` : 
                      `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 200px;">
                        <i class="fas fa-utensils fa-3x text-muted"></i>
                      </div>`
                    }
                  </div>
                </div>
                <div class="col-md-8">
                  <h4 class="fw-bold text-primary mb-3">${menuItem.name}</h4>
                  
                  <div class="row mb-3">
                    <div class="col-sm-6">
                      <div class="d-flex align-items-center mb-2">
                        <i class="fas fa-tag text-success me-2"></i>
                        <strong>Price:</strong>
                        <span class="ms-2 fs-5 text-success fw-bold">₱${menuItem.price || '0.00'}</span>
                      </div>
                    </div>
                    <div class="col-sm-6">
                      <div class="d-flex align-items-center mb-2">
                        <i class="fas fa-folder text-info me-2"></i>
                        <strong>Category:</strong>
                        <span class="badge bg-secondary ms-2">${menuItem.category || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  ${menuItem.description ? `
                    <div class="mb-3">
                      <h6 class="fw-bold text-dark mb-2">
                        <i class="fas fa-align-left text-muted me-2"></i>Description
                      </h6>
                      <p class="text-muted">${menuItem.description}</p>
                    </div>
                  ` : ''}

                  <div class="mb-3">
                    <h6 class="fw-bold text-dark mb-2">
                      <i class="fas fa-list text-muted me-2"></i>Ingredients (${menuItem.ingredients ? menuItem.ingredients.length : 0})
                    </h6>
                    ${menuItem.ingredients && menuItem.ingredients.length > 0 ? `
                      <div class="row">
                        ${menuItem.ingredients.map(ing => `
                          <div class="col-md-6 mb-2">
                            <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                              <span class="fw-medium">${ing.name || ing.inventoryItem || 'Unknown'}</span>
                              <span class="badge bg-primary">${ing.quantity || 1} ${ing.unit || 'unit'}</span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <div class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        No ingredients listed
                      </div>
                    `}
                  </div>

                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Close
              </button>
              <button type="button" class="btn btn-primary" onclick="editMenuItem('${menuItem._id}'); bootstrap.Modal.getInstance(document.getElementById('viewMenuModal')).hide();">
                <i class="fas fa-edit me-1"></i>Edit Item
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('viewMenuModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', viewModal);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewMenuModal'));
    modal.show();

    // Clean up modal when hidden
    document.getElementById('viewMenuModal').addEventListener('hidden.bs.modal', function() {
      this.remove();
    });

  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  }
}

// Make functions globally available
window.removeEditIngredient = removeEditIngredient;
window.addEditIngredient = addEditIngredient;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.viewMenuItem = viewMenuItem;
window.toggleImageInput = toggleImageInput;
window.handleImageFileSelect = handleImageFileSelect;

// Delete menu item
async function deleteMenuItem(id) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`${MENU_DELETE_URL}${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local arrays
        allMenuItems = allMenuItems.filter(item => item._id !== id);
        filteredMenuItems = filteredMenuItems.filter(item => item._id !== id);
        
        // Re-render table
        renderMenuTableWithPagination(filteredMenuItems);
        
        // Store that Menu tab should be active after reload
        localStorage.setItem('activeInventoryTab', 'menu-tab');
        
        // Add a small delay to ensure everything is ready before showing SweetAlert
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Show success message and wait for user to click OK
        const result = await Swal.fire({
          title: 'Deleted!',
          text: 'Menu item has been deleted.',
          icon: 'success',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          allowEscapeKey: false
        });
        // Only reload if user clicked OK
        if (result.isConfirmed) {
          window.location.reload();
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete menu item');
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }
}

// Setup menu table sorting
function setupMenuSorting() {
  const sortableHeaders = document.querySelectorAll('.sortable');
  sortableHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const column = this.dataset.column;
      
      // Toggle sort direction
      if (menuSortColumn === column) {
        menuSortDirection = menuSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        menuSortColumn = column;
        menuSortDirection = 'asc';
      }
      
      // Update sort icons
      updateSortIcons();
      
      // Sort and render menu items
      sortMenuItems();
      renderMenuTableWithPagination();
    });
  });
}

// Update sort icons in table headers
function updateSortIcons() {
  const sortableHeaders = document.querySelectorAll('.sortable');
  sortableHeaders.forEach(header => {
    const icon = header.querySelector('i');
    const column = header.dataset.column;
    
    if (column === menuSortColumn) {
      icon.className = menuSortDirection === 'asc' ? 'fas fa-sort-up ms-1' : 'fas fa-sort-down ms-1';
    } else {
      icon.className = 'fas fa-sort ms-1';
    }
  });
}

// Sort menu items based on current sort column and direction
function sortMenuItems() {
  // Ensure filteredMenuItems is an array before sorting
  if (!Array.isArray(filteredMenuItems)) {
    console.error('sortMenuItems: filteredMenuItems is not an array:', filteredMenuItems);
    filteredMenuItems = [];
    return;
  }
  
  filteredMenuItems.sort((a, b) => {
    let aValue, bValue;
    
    switch (menuSortColumn) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      case 'price':
        aValue = parseFloat(a.price);
        bValue = parseFloat(b.price);
        break;
      case 'ingredients':
        aValue = a.ingredients ? a.ingredients.length : 0;
        bValue = b.ingredients ? b.ingredients.length : 0;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) {
      return menuSortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return menuSortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

// Tab change event listeners (added to existing DOMContentLoaded)
function initializeTabListeners() {
  // Add event listeners for tab changes
  const inventoryTab = document.getElementById('inventory-tab');
  const menuTab = document.getElementById('menu-tab');
  
  if (inventoryTab) {
    inventoryTab.addEventListener('shown.bs.tab', function() {
      // Load inventory when inventory tab is shown
      fetchInventory();
    });
  }
  
  if (menuTab) {
    menuTab.addEventListener('shown.bs.tab', function() {
      // Load menu items when menu tab is shown
      fetchMenuItems();
    });
  }
  
  // Menu search functionality
  const menuSearchInput = document.getElementById('menuSearchInput');
  const clearMenuSearch = document.getElementById('clearMenuSearch');
  
  if (menuSearchInput) {
    menuSearchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      // Filter menu items based on search term across multiple fields
      filteredMenuItems = allMenuItems.filter(item => {
        // Search in name
        const nameMatch = item.name.toLowerCase().includes(searchTerm);
        
        // Search in category
        const categoryMatch = item.category.toLowerCase().includes(searchTerm);
        
        // Search in price (convert to string for partial matching)
        const priceMatch = item.price.toString().includes(searchTerm);
        
        // Search in ingredients (check ingredient names)
        const ingredientsMatch = item.ingredients && item.ingredients.some(ingredient => 
          ingredient.inventoryItem && ingredient.inventoryItem.toLowerCase().includes(searchTerm)
        );
        
        return nameMatch || categoryMatch || priceMatch || ingredientsMatch;
      });
      
      // Apply sorting
      sortMenuItems();
      
      // Reset to first page and render
      currentMenuPage = 1;
      renderMenuTableWithPagination();
    });
  }
  
  if (clearMenuSearch) {
    clearMenuSearch.addEventListener('click', function() {
      menuSearchInput.value = '';
      filteredMenuItems = [...allMenuItems];
      sortMenuItems();
      currentMenuPage = 1;
      renderMenuTableWithPagination();
    });
  }
  
  // Inventory search functionality
  const inventorySearchInput = document.getElementById('inventorySearchInput');
  const clearInventorySearch = document.getElementById('clearInventorySearch');
  
  if (inventorySearchInput) {
    inventorySearchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      // Ensure allIngredients is an array before filtering
      if (!Array.isArray(allIngredients)) {
        console.error('inventorySearchInput: allIngredients is not an array:', allIngredients);
        allIngredients = [];
      }
      
      // Filter inventory items based on search term across multiple fields
      filteredIngredients = allIngredients.filter(item => {
        // Search in name
        const nameMatch = item.name && item.name.toLowerCase().includes(searchTerm);
        
        // Search in stocks (convert to string for partial matching)
        const stocksMatch = item.stocks && item.stocks.toString().includes(searchTerm);
        
        // Search in units
        const unitsMatch = item.units && item.units.toLowerCase().includes(searchTerm);
        
        // Search in restocked date (convert to string for partial matching)
        const restockedMatch = item.restocked && new Date(item.restocked).toLocaleDateString().includes(searchTerm);
        
        // Search in status
        const statusMatch = item.status && item.status.toLowerCase().includes(searchTerm);
        
        return nameMatch || stocksMatch || unitsMatch || restockedMatch || statusMatch;
      });
      
      // Reset to first page and render
      currentPage = 1;
      renderIngredientsTableWithPagination();
    });
  }
  
  if (clearInventorySearch) {
    clearInventorySearch.addEventListener('click', function() {
      inventorySearchInput.value = '';
      // Ensure allIngredients is an array before copying
      if (Array.isArray(allIngredients)) {
        filteredIngredients = [...allIngredients];
      } else {
        filteredIngredients = [];
      }
      currentPage = 1;
      renderIngredientsTableWithPagination();
    });
  }
  
  // Store current active tab in localStorage to maintain state
  const allTabs = document.querySelectorAll('[data-bs-toggle="tab"]');
  allTabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', function() {
      localStorage.setItem('activeInventoryTab', this.id);
    });
  });
  
  // Restore active tab on page load
  const activeTabId = localStorage.getItem('activeInventoryTab');
  if (activeTabId && document.getElementById(activeTabId)) {
    // Always restore the saved tab, even if another tab is active
    const activeTab = new bootstrap.Tab(document.getElementById(activeTabId));
    activeTab.show();
  }
  
  // Menu pagination event listeners
  const menuPrevPage = document.getElementById('menuPrevPage');
  const menuNextPage = document.getElementById('menuNextPage');
  
  if (menuPrevPage) {
    menuPrevPage.addEventListener('click', () => {
      if (currentMenuPage > 1) {
        currentMenuPage--;
        renderMenuTableWithPagination(filteredMenuItems);
      }
    });
  }
  
  if (menuNextPage) {
    menuNextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredMenuItems.length / menuItemsPerPage);
      if (currentMenuPage < totalPages) {
        currentMenuPage++;
        renderMenuTableWithPagination(filteredMenuItems);
      }
    });
  }
}