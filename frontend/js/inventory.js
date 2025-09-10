// Check user authentication and role
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!user.role || user.role !== 'admin') {
  window.location.href = 'pos.html';
}

// Pagination variables
let allIngredients = [];
let filteredIngredients = [];
let currentPage = 1;
const itemsPerPage = 10;

// Menu variables
let allMenuItems = [];
let filteredMenuItems = [];
let currentMenuPage = 1;
const menuItemsPerPage = 10;

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

function getStatusBadge(status, calculatedStatus, isOverridden) {
  let badgeClass = 'bg-success';
  if (status === 'low stock') badgeClass = 'bg-warning text-dark';
  if (status === 'out of stock') badgeClass = 'bg-danger';
  
  let badge = `<span class="badge ${badgeClass}">${status}</span>`;
  
  // Add override indicator if status differs from calculated
  if (isOverridden) {
    badge += ` <small class="text-muted">(override)</small>`;
  }
  
  return badge;
}

function renderIngredientsTableWithPagination(ingredients) {
  const tbody = document.getElementById('ingredientsTableBody');
  if (!tbody) return;

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
    ingredient.status === 'out of stock' || ingredient.stocks <= 0
  ).length;
  const lowStock = ingredients.filter(ingredient => 
    ingredient.status === 'low stock' || (ingredient.stocks > 0 && ingredient.stocks <= 10)
  ).length;
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
        else if (stocks <= 10) suggestedStatus = 'low stock';
        
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
        else if (stocks <= 10) suggestedStatus = 'low stock';
        
        // Show suggestion
        statusSelect.title = `Calculated: ${suggestedStatus}`;
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
              <span class="badge ${ingredient.status === 'in stock' ? 'bg-success' : ingredient.status === 'low stock' ? 'bg-warning' : 'bg-danger'} ms-1">
                ${ingredient.status}
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
        <td colspan="6" class="text-center text-danger">
          <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
          <div>Error loading menu items: ${error.message}</div>
        </td>
      </tr>
    `;
  }
}

// Render menu table with pagination
function renderMenuTableWithPagination(menuItems) {
  const tbody = document.getElementById('menuTableBody');
  if (!tbody) return;

  const totalPages = Math.ceil(menuItems.length / menuItemsPerPage);
  
  // Calculate start and end indices for current page
  const startIndex = (currentMenuPage - 1) * menuItemsPerPage;
  const endIndex = startIndex + menuItemsPerPage;
  const currentMenuItems = menuItems.slice(startIndex, endIndex);
  
  if (currentMenuItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
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
          <small class="text-muted">
            ${item.ingredients && item.ingredients.length > 0 
              ? item.ingredients.map(ing => ing.name).join(', ') 
              : 'No ingredients listed'}
          </small>
        </td>
        <td>
          <span class="badge ${item.isAvailable ? 'bg-success' : 'bg-danger'}">
            ${item.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" onclick="editMenuItem('${item._id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMenuItem('${item._id}')" title="Delete">
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

    // Create edit form HTML with smaller inputs
    const editForm = `
      <form id="editMenuForm">
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="editMenuName" class="form-label">Menu Name</label>
            <input type="text" class="form-control form-control-sm" id="editMenuName" value="${menuItem.name}" required>
          </div>
          <div class="col-md-6 mb-3">
            <label for="editMenuPrice" class="form-label">Price</label>
            <input type="number" class="form-control form-control-sm" id="editMenuPrice" value="${menuItem.price}" step="0.01" required>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="editMenuCategory" class="form-label">Category</label>
            <select class="form-select form-select-sm" id="editMenuCategory" required>
              <option value="ramen" ${menuItem.category === 'ramen' ? 'selected' : ''}>Ramen</option>
              <option value="ricebowl" ${menuItem.category === 'ricebowl' ? 'selected' : ''}>Rice Bowl</option>
              <option value="sides" ${menuItem.category === 'sides' ? 'selected' : ''}>Sides</option>
              <option value="drinks" ${menuItem.category === 'drinks' ? 'selected' : ''}>Drinks</option>
            </select>
          </div>
          <div class="col-md-6 mb-3">
            <label for="editMenuImage" class="form-label">Image</label>
            <div class="input-group input-group-sm">
              <input type="text" class="form-control" id="editMenuImage" value="${menuItem.image || ''}" placeholder="Enter image URL">
              <input type="file" class="form-control" id="editMenuImageFile" accept="image/*" style="display: none;" onchange="window.handleImageFileSelect(event)">
              <button class="btn btn-outline-secondary" type="button" onclick="window.toggleImageInput()">
                <i class="fas fa-upload"></i>
              </button>
            </div>
            <small class="text-muted">Enter URL or click upload to choose file</small>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Ingredients</label>
          <div id="editIngredientsList" style="max-height: 200px; overflow-y: auto;">
            ${menuItem.ingredients && menuItem.ingredients.length > 0 
              ? menuItem.ingredients.map((ing, index) => `
                  <div class="d-flex mb-2">
                    <input type="text" class="form-control form-control-sm me-2" value="${ing.inventoryItem}" placeholder="Ingredient name" readonly>
                    <input type="number" class="form-control form-control-sm me-2" value="${ing.quantity}" placeholder="Quantity" step="0.1" style="width: 100px;">
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeEditIngredient(this)" title="Remove ingredient">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                `).join('')
              : '<p class="text-muted small">No ingredients</p>'
            }
          </div>
        </div>
        <div id="editMenuError" class="alert alert-danger" style="display: none;"></div>
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
      width: '500px',
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

          // TODO: Add logic to gather updated ingredients from the form
          formData.append('ingredients', JSON.stringify([]));

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

// Make functions globally available
window.removeEditIngredient = removeEditIngredient;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
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