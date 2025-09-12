// Use API_BASE_URL from config.js
const authToken = localStorage.getItem("authToken");

let kitchenOrders = [];
let socket = io(getSocketUrl());

// Load kitchen orders
async function loadKitchenOrders() {
  try {
    const response = await fetch(`${API_BASE_URL}/kitchen/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to load orders');
    
    kitchenOrders = await response.json();
    displayOrders();
  } catch (error) {
    console.error('Error loading kitchen orders:', error);
    showError('Failed to load kitchen orders');
  }
}

// Display orders in kitchen format
function displayOrders() {
  const pendingOrders = kitchenOrders.filter(order => order.status === 'pending');
  const preparingOrders = kitchenOrders.filter(order => order.status === 'preparing');
  
  displayOrderList('pendingOrders', pendingOrders);
  displayOrderList('preparingOrders', preparingOrders);
  
  // Update counters
  const pendingCountEl = document.getElementById('pendingCount');
  const preparingCountEl = document.getElementById('preparingCount');
  const pendingBadgeEl = document.getElementById('pendingBadge');
  const preparingBadgeEl = document.getElementById('preparingBadge');
  
  if (pendingCountEl) pendingCountEl.textContent = pendingOrders.length;
  if (preparingCountEl) preparingCountEl.textContent = preparingOrders.length;
  if (pendingBadgeEl) pendingBadgeEl.textContent = pendingOrders.length;
  if (preparingBadgeEl) preparingBadgeEl.textContent = preparingOrders.length;
}

// Display order list
function displayOrderList(containerId, orders) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  // Make container wrap small cards nicely
  container.className = 'd-flex flex-wrap gap-2';
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <p>No orders</p>
      </div>
    `;
    return;
  }
  
  orders.forEach(order => {
    const orderCard = createOrderCard(order);
    container.appendChild(orderCard);
  });
}

// Create order card
function createOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'card shadow-sm border-0';
  card.style.width = '18rem';
  
  // Calculate total order amount
  const totalAmount = order.items.reduce((sum, item) => {
    const itemTotal = item.menuItem.price * item.quantity;
    const addOnsTotal = item.selectedAddOns ? item.selectedAddOns.reduce((addonSum, addon) => addonSum + addon.price, 0) : 0;
    return sum + itemTotal + addOnsTotal;
  }, 0);
  
  const itemsCount = order.items?.length || 0;
  const firstItem = order.items && order.items[0] ? `${order.items[0].menuItem.name} x${order.items[0].quantity}` : 'No items';
  card.innerHTML = `
    <div class="card-body p-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <h6 class="card-title mb-0">#${order.orderId}</h6>
        <span class="badge ${order.status === 'pending' ? 'bg-warning text-dark' : 'bg-info text-white'}">${order.status}</span>
      </div>
      <div class="text-muted small mb-2">
        ${order.customerName || 'Walk-in'} • ${new Date(order.orderTime).toLocaleTimeString()} • ${itemsCount} item${itemsCount!==1?'s':''}
      </div>
      <p class="card-text mb-2 small">
        ${firstItem}${itemsCount > 1 ? `, +${itemsCount - 1} more` : ''}
      </p>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <div class="fw-semibold text-primary">₱${totalAmount.toFixed(2)}</div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails('${order.id}')" title="View">
            <i class="fas fa-eye"></i>
          </button>
          ${order.status === 'pending' ? `
            <button class="btn btn-sm btn-warning" onclick="updateOrderStatus('${order.id}', 'preparing')" title="Start">
              <i class="fas fa-play"></i>
            </button>
          ` : `
            <button class="btn btn-sm btn-success" onclick="updateOrderStatus('${order.id}', 'ready')" title="Ready">
              <i class="fas fa-check"></i>
            </button>
          `}
        </div>
      </div>
    </div>
  `;
  
  return card;
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    // Find the order to get the correct orderId (not database _id)
    const order = kitchenOrders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/kitchen/orders/${order.orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) throw new Error('Failed to update status');
    
    // Reload orders
    await loadKitchenOrders();
  } catch (error) {
    console.error('Error updating order status:', error);
    showError('Failed to update order status');
  }
}

// View order details
function viewOrderDetails(orderId) {
  const order = kitchenOrders.find(o => o.id === orderId);
  if (!order) return;
  
  const modalContent = document.getElementById('orderDetailsContent');
  modalContent.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <h6>Order Information</h6>
        <p><strong>Order ID:</strong> #${order.orderId}</p>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Type:</strong> ${order.type.toUpperCase()}</p>
        <p><strong>Status:</strong> <span class="badge bg-warning">${order.status}</span></p>
        <p><strong>Time:</strong> ${new Date(order.orderTime).toLocaleString()}</p>
        ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
      </div>
      <div class="col-md-6">
        <h6>Order Items</h6>
        ${order.items.map(item => `
          <div class="border-bottom py-2">
            <div class="fw-bold">${item.menuItem.name} x${item.quantity}</div>
            <div class="text-muted">₱${(item.menuItem.price * item.quantity).toFixed(2)}</div>
            ${item.selectedAddOns && item.selectedAddOns.length > 0 ? `
              <div class="mt-1">
                <small class="text-success fw-bold">Add-ons:</small>
                ${item.selectedAddOns.map(addon => `
                  <div class="small text-success ms-2">+ ${addon.name} (+₱${addon.price.toFixed(2)})</div>
                `).join('')}
              </div>
            ` : ''}
            ${item.removedIngredients && item.removedIngredients.length > 0 ? `
              <div class="mt-1">
                <small class="text-danger fw-bold">Remove:</small>
                ${item.removedIngredients.map(ingredient => `
                  <div class="small text-danger ms-2">- ${ingredient.name}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
  modal.show();
}

// Show error message
function showError(message) {
  // You can implement a toast notification or alert here
  console.error(message);
}

// Socket.IO real-time updates
socket.on('kitchenUpdate', (data) => {
  console.log('Kitchen update received:', data);
  loadKitchenOrders();
});

socket.on('newOrder', (data) => {
  console.log('New order received:', data);
  loadKitchenOrders();
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Initialize sidebar toggle
  initializeSidebar();
  
  // Load kitchen orders
  loadKitchenOrders();
  setInterval(loadKitchenOrders, 30000); // Refresh every 30 seconds
  
  // Add test button for notifications (for development/testing)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Notification';
    testButton.className = 'btn btn-success btn-sm position-fixed';
    testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
    testButton.onclick = function() {
      showGlobalNotification('Test notification from Kitchen!', 'success');
    };
    document.body.appendChild(testButton);
  }
});

// Initialize sidebar functionality
function initializeSidebar() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebarMenu');
  
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }
  
  if (closeSidebar) {
    closeSidebar.addEventListener('click', () => {
      sidebar.classList.remove('show');
    });
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768 && 
        !sidebar.contains(e.target) && 
        !sidebarToggle.contains(e.target) && 
        sidebar.classList.contains('show')) {
      sidebar.classList.remove('show');
    }
  });
}
