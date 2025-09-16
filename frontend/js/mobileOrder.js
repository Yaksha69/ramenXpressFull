// Mobile Order Management JavaScript

// Remove the ES6 import for socket.io-client
// import { io } from "socket.io-client";

// Use API_BASE_URL from config.js
const authToken = localStorage.getItem("authToken"); // For admin/cashier authentication

let loadedOrders = [];
let currentPage = 1;
let ordersPerPage = 10;
let totalOrders = 0;
let filteredOrders = [];

// Helper function to get correct image URL from backend data
function getImageUrl(imagePath) {
  console.log('getImageUrl called with:', imagePath);
  
  if (!imagePath) {
    console.log('No image path, using default');
    return '../assets/ramen1.jpg'; // Default image
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    console.log('Full URL detected:', imagePath);
    return imagePath;
  }
  
  // If it starts with /uploads/, it's a backend uploaded image
  if (imagePath.startsWith('/uploads/')) {
    const url = `${getUploadUrl()}${imagePath}`;
    console.log('Backend uploaded image:', url);
    return url;
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
      const url = `${getUploadUrl()}/uploads/menus/${databaseImage}`;
      console.log('Using database image:', url);
      return url;
    }
    const url = `${getUploadUrl()}/uploads/menus/${imagePath}`;
    console.log('Backend uploaded filename, using uploads path:', url);
    return url;
  }
  
  // If it's just a filename without extension, assume it's in assets
  if (!imagePath.includes('/')) {
    const url = `../assets/${imagePath}`;
    console.log('Backend filename, using assets path:', url);
    return url;
  }
  
  // If it's any other path from backend, try to use it as is
  console.log('Using backend path as is:', imagePath);
  return imagePath;
}

document.addEventListener("DOMContentLoaded", function () {
    loadMobileOrders();
    initializeFilters();
    window.addEventListener('focus', loadMobileOrders);
    setInterval(loadMobileOrders, 5000); // every 5 seconds
    
    // Add test button for new order notification (for development/testing)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const testButton = document.createElement('button');
        testButton.textContent = 'Test New Order Notification';
        testButton.className = 'btn btn-warning btn-sm position-fixed';
        testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
        testButton.onclick = function() {
            const testOrder = {
                _id: 'test_' + Date.now(),
                orderId: 'TEST' + Math.floor(Math.random() * 1000),
                customerName: 'Test Customer',
                total: 150.00,
                status: 'pending',
                paymentMethod: 'GCash',
                createdAt: new Date().toISOString()
            };
            showNewOrderNotification(testOrder);
        };
        document.body.appendChild(testButton);
    }
});

// Initialize filter functionality
function initializeFilters() {
    // Initialize date range picker
    $('#filterDate').daterangepicker({
        autoUpdateInput: false,
        locale: {
            cancelLabel: 'Clear',
            format: 'YYYY-MM-DD'
        }
    });

    $('#filterDate').on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
        applyFilters();
    });

    $('#filterDate').on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
        applyFilters();
    });

    // Add event listeners for filter changes
    const filterOrderStatus = document.getElementById('filterOrderStatus');
    const filterPaymentMethod = document.getElementById('filterPaymentMethod');
    const filterApplyBtn = document.getElementById('filterApplyBtn');
    
    if (filterOrderStatus) {
        filterOrderStatus.addEventListener('change', applyFilters);
    }
    if (filterPaymentMethod) {
        filterPaymentMethod.addEventListener('change', applyFilters);
    }
    if (filterApplyBtn) {
        filterApplyBtn.addEventListener('click', applyFilters);
    }
}

// Apply all filters
function applyFilters() {
    const statusFilterElement = document.getElementById('filterOrderStatus');
    const paymentFilterElement = document.getElementById('filterPaymentMethod');
    const dateRangeElement = document.getElementById('filterDate');
    
    const statusFilter = statusFilterElement ? statusFilterElement.value : 'all';
    const paymentFilter = paymentFilterElement ? paymentFilterElement.value : 'all';
    const dateRange = dateRangeElement ? dateRangeElement.value : '';

    // Start with all loaded orders
    filteredOrders = [...loadedOrders];

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Apply payment method filter
    if (paymentFilter && paymentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            const paymentMethod = order.paymentMethod || '';
            return paymentMethod.toLowerCase() === paymentFilter.toLowerCase();
        });
    }

    // Apply date range filter
    if (dateRange && dateRange.includes(' - ')) {
        const [startDate, endDate] = dateRange.split(' - ');
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end day

        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= start && orderDate <= end;
        });
    }

    // Reset to first page when filtering
    currentPage = 1;
    
    // Display filtered results
    displayOrders(filteredOrders);
}

// Sort orders function - puts delivered orders at the bottom
function sortOrders(orders) {
    return orders.sort((a, b) => {
        // Define status priority (lower number = higher priority)
        const statusPriority = {
            'pending': 1,
            'preparing': 2,
            'ready': 3,
            'out-for-delivery': 4,
            'cancelled': 5,
            'delivered': 6
        };
        
        const aPriority = statusPriority[a.status] || 7;
        const bPriority = statusPriority[b.status] || 7;
        
        // If same priority, sort by date (newest first)
        if (aPriority === bPriority) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        
        return aPriority - bPriority;
    });
}

// Update displayOrders to work with filtered data and pagination
function displayOrders(orders) {
    window.lastLoadedOrders = orders;
    const tbody = document.getElementById("ordersTableBody");
    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x mb-2"></i>
                <br>No orders found
                </td>
            </tr>
        `;
        renderPagination(0, 0);
        return;
    }

    // Sort orders to put delivered at the bottom
    const sortedOrders = sortOrders([...orders]);
    
    totalOrders = sortedOrders.length;

    // Calculate pagination
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

    // Display all orders with pagination (sorted with delivered at bottom)
    paginatedOrders.forEach(order => {
        const orderDate = new Date(order.createdAt).toLocaleString();
        const statusBadge = getStatusBadge(order.status);
        let paymentStatus = order.paymentStatus;
        if (!paymentStatus) {
            if (order.paymentMethod && order.paymentMethod.toLowerCase() !== 'cash on delivery') {
                paymentStatus = 'paid';
            } else {
                paymentStatus = 'pending';
            }
        }
        const paymentBadge = getPaymentBadge(paymentStatus);
        const row = document.createElement("tr");
        const customerName = getCustomerDisplayName(order);
        const isUpdateDisabled = order.status === 'delivered' || order.status === 'cancelled';
        row.setAttribute('data-order-id', order._id);
        row.innerHTML = `
            <td>#${order.orderId || order._id}</td>
            <td>${customerName}</td>
            <td>${orderDate}</td>
            <td>₱${order.total ? order.total.toFixed(2) : "0.00"}</td>
            <td>${paymentBadge}</td>
            <td class="status-cell">${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails('${order._id}')">View</button>
                <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus('${order._id}')" ${isUpdateDisabled ? 'disabled' : ''}>Update</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Get current filter values for conditional display
    const statusFilterElement = document.getElementById('filterOrderStatus');
    const currentStatusFilter = statusFilterElement ? statusFilterElement.value : 'all';
    
    // Get delivered orders for separator display
    const deliveredOrders = sortedOrders.filter(order => order.status === 'delivered');
    
    // If there are delivered orders, add a separator row
    if (currentStatusFilter === 'all' && deliveredOrders.length > 0) {
        const sepRow = document.createElement("tr");
        sepRow.innerHTML = `<td colspan="7" class="text-center text-success fw-bold bg-light">Delivered Orders</td>`;
        tbody.appendChild(sepRow);
    }

    // Show delivered orders below
    if (currentStatusFilter === 'all') {
        deliveredOrders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleString();
            const statusBadge = getStatusBadge(order.status);
            let paymentStatus = order.paymentStatus;
            if (!paymentStatus) {
                if (order.paymentMethod && order.paymentMethod.toLowerCase() !== 'cash on delivery') {
                    paymentStatus = 'paid';
                } else {
                    paymentStatus = 'pending';
                }
            }
            const paymentBadge = getPaymentBadge(paymentStatus);
            const row = document.createElement("tr");
            const customerName = getCustomerDisplayName(order);
            const isUpdateDisabled = order.status === 'delivered' || order.status === 'cancelled';
            row.setAttribute('data-order-id', order._id);
            row.innerHTML = `
                <td>#${order.orderId || order._id}</td>
                <td>${customerName}</td>
                <td>${orderDate}</td>
                <td>₱${order.total ? order.total.toFixed(2) : "0.00"}</td>
                <td>${paymentBadge}</td>
                <td class="status-cell">${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails('${order._id}')">View</button>
                    <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus('${order._id}')" ${isUpdateDisabled ? 'disabled' : ''}>Update</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    // Render pagination
    renderPagination(totalOrders, currentPage);
}

// Load mobile orders from backend
async function loadMobileOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/mobile-orders/all`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const orders = await response.json();
        
        // Check for new orders (only if we have previously loaded orders)
        if (loadedOrders.length > 0) {
            const newOrders = orders.filter(newOrder => 
                !loadedOrders.some(existingOrder => existingOrder._id === newOrder._id)
            );
            
            // Show notification for each new order
            newOrders.forEach(order => {
                // Only show notification for pending orders (new orders)
                if (order.status === 'pending') {
                    showNewMobileOrderNotification(order);
                }
            });
        }
        
        loadedOrders = orders; // Store for modal use
        filteredOrders = [...orders]; // Initialize filtered orders
        displayOrders(orders);
    } catch (error) {
        console.error("Error loading mobile orders:", error);
        showGlobalNotification("Failed to load orders. Please check your connection.", "error");
    }
}

// Status badge - Updated to include out-for-delivery
function getStatusBadge(status) {
    const map = {
        pending: '<span class="badge bg-secondary">Pending</span>',
        preparing: '<span class="badge bg-warning text-dark">Preparing</span>',
        ready: '<span class="badge bg-info">Ready</span>',
        'out-for-delivery': '<span class="badge bg-primary">Out for Delivery</span>',
        delivered: '<span class="badge bg-success">Delivered</span>',
        cancelled: '<span class="badge bg-danger">Cancelled</span>'
    };
    return map[status] || map["pending"];
}

// Payment badge
function getPaymentBadge(status) {
    const map = {
        paid: '<span class="badge bg-success">Paid</span>',
        pending: '<span class="badge bg-warning text-dark">Pending</span>',
        failed: '<span class="badge bg-danger">Failed</span>'
    };
    return map[status] || map["pending"];
}

function getCustomerDisplayName(order) {
    // Check if customerId is populated and has the expected structure
    if (order.customerId) {
        // If customerId is an object (populated), check for name fields
        if (typeof order.customerId === 'object' && order.customerId !== null) {
            // Check for fullName first (virtual field)
            if (order.customerId.fullName && order.customerId.fullName.trim()) {
                return order.customerId.fullName;
            }
            // Check for firstName and lastName
            if (order.customerId.firstName || order.customerId.lastName) {
                const firstName = order.customerId.firstName || '';
                const lastName = order.customerId.lastName || '';
                return `${firstName} ${lastName}`.trim();
            }
            // Fallback to name field if exists
            if (order.customerId.name && order.customerId.name.trim()) {
                return order.customerId.name;
            }
        }
    }
    
    // Check for direct customerName field
    if (order.customerName && order.customerName.trim()) {
        return order.customerName;
    }
    
    // If no customer data found, return a default
    return 'Customer';
}

// Use global notification functions
// These functions are now provided by globalNotifications.js

// Add a function to show success notification using global notification
function showSuccessModal(message, status) {
    // Determine icon based on status
    let icon = 'success';
    
    switch ((status || '').toLowerCase()) {
        case 'preparing':
            icon = 'warning';
            break;
        case 'ready':
            icon = 'success';
            break;
        case 'out-for-delivery':
            icon = 'info';
            break;
        case 'delivered':
            icon = 'success';
            break;
        case 'cancelled':
            icon = 'error';
            break;
        case 'pending':
            icon = 'info';
            break;
        default:
            icon = 'success';
    }
    
    showGlobalNotification(message, icon);
}

window.viewOrderDetails = async function(orderId) {
    await loadMobileOrders();
    const order = loadedOrders.find(o => o._id === orderId);
    if (!order) {
        showGlobalNotification("Order not found.", "error");
        return;
    }
    // Customer info
    let customerName = getCustomerDisplayName(order);
    let customerPhone = "N/A";
    let customerAddress = order.deliveryAddress || "N/A";
    
    // Get customer phone and address from populated customerId
    if (order.customerId && typeof order.customerId === 'object' && order.customerId !== null) {
        console.log('Customer data:', order.customerId);
        customerPhone = order.customerId.phone || "N/A";
        // Note: Customer model doesn't have address field, so we use deliveryAddress from order
    } else {
        console.log('No customer data found for order:', order.orderId);
    }
    document.getElementById('modalOrderId').textContent = `#${order.orderId || order._id}`;
    document.getElementById('modalOrderDate').textContent = new Date(order.createdAt).toLocaleString();
    document.getElementById('modalCustomerName').textContent = customerName;
    document.getElementById('modalCustomerPhone').textContent = customerPhone;
    document.getElementById('modalCustomerAddress').textContent = customerAddress || "N/A";
    // Status badges
    const orderStatusElement = document.getElementById('modalOrderStatus');
    const paymentStatusElement = document.getElementById('modalPaymentStatus');
    orderStatusElement.className = 'badge';
    paymentStatusElement.className = 'badge';
    // Set status classes - Updated to include out-for-delivery
    switch(order.status) {
        case 'preparing':
            orderStatusElement.classList.add('bg-warning', 'text-dark');
            break;
        case 'ready':
            orderStatusElement.classList.add('bg-info');
            break;
        case 'out-for-delivery':
            orderStatusElement.classList.add('bg-primary');
            break;
        case 'delivered':
            orderStatusElement.classList.add('bg-success');
            break;
        case 'pending':
            orderStatusElement.classList.add('bg-secondary');
            break;
        case 'cancelled':
            orderStatusElement.classList.add('bg-danger');
            break;
        default:
            orderStatusElement.classList.add('bg-secondary');
    }
    orderStatusElement.textContent = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ') : "N/A";
    // Infer payment status if missing
    let paymentStatus = order.paymentStatus;
    if (!paymentStatus) {
        if (order.paymentMethod && order.paymentMethod.toLowerCase() !== 'cash on delivery') {
            paymentStatus = 'paid';
        } else {
            paymentStatus = 'pending';
        }
    }
    switch(paymentStatus) {
        case 'paid':
            paymentStatusElement.classList.add('bg-success');
            break;
        case 'pending':
            paymentStatusElement.classList.add('bg-warning', 'text-dark');
            break;
        case 'failed':
            paymentStatusElement.classList.add('bg-danger');
            break;
        default:
            paymentStatusElement.classList.add('bg-secondary');
    }
    paymentStatusElement.textContent = paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : "N/A";
    // Order items
    const tbody = document.getElementById('modalOrderItems');
    tbody.innerHTML = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const name = item.menuItem && item.menuItem.name ? item.menuItem.name : 'N/A';
            const price = item.menuItem && typeof item.menuItem.price === 'number' ? item.menuItem.price : 0;
            const image = item.menuItem && item.menuItem.image ? item.menuItem.image : 'logo.png';
            const quantity = item.quantity || 0;
            // Add-ons and removed ingredients
            let customizationsHtml = '';
            let addOnsTotal = 0;
            
            // Add-ons
            if (item.selectedAddOns && item.selectedAddOns.length > 0) {
                customizationsHtml += '<ul class="mb-0 ps-3 small text-muted">';
                item.selectedAddOns.forEach(addOn => {
                    customizationsHtml += `<li><i class="fas fa-plus-circle text-success me-1"></i>${addOn.name} (+₱${addOn.price.toFixed(2)})</li>`;
                    addOnsTotal += addOn.price;
                });
                customizationsHtml += '</ul>';
            }
            
            // Removed ingredients
            if (item.removedIngredients && item.removedIngredients.length > 0) {
                if (customizationsHtml) {
                    customizationsHtml += '<ul class="mb-0 ps-3 small text-muted mt-1">';
                } else {
                    customizationsHtml += '<ul class="mb-0 ps-3 small text-muted">';
                }
                item.removedIngredients.forEach(ingredient => {
                    customizationsHtml += `<li><i class="fas fa-minus-circle text-warning me-1"></i>No ${ingredient}</li>`;
                });
                customizationsHtml += '</ul>';
            }
            const itemUnitTotal = price + addOnsTotal;
            const subtotal = itemUnitTotal * quantity;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="item-image me-3">
                            <img src="${getImageUrl(image)}" alt="${name}" class="menu-item-img" onerror="this.src='../assets/ramen1.jpg'">
                        </div>
                        <div>
                            <div class="fw-semibold">${name}</div>  
                            ${customizationsHtml}
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge bg-light text-dark">${quantity}</span>
                </td>
                <td class="text-end">₱${itemUnitTotal.toFixed(2)}</td>
                <td class="text-end fw-semibold">₱${subtotal.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No items</td></tr>';
    }
    // Summary
    // Subtotal row removed from modal, so do not set modalSubtotal
    document.getElementById('modalDeliveryFee').textContent = `₱${order.deliveryFee ? order.deliveryFee.toFixed(2) : '0.00'}`;
    // Calculate total: sum of all item subtotals (including add-ons) + deliveryFee
    let computedTotal = 0;
    if (order.items && order.items.length > 0) {
        computedTotal = order.items.reduce((sum, item) => {
            const price = item.menuItem && typeof item.menuItem.price === 'number' ? item.menuItem.price : 0;
            const quantity = item.quantity || 0;
            let addOnsTotal = 0;
            if (item.selectedAddOns && item.selectedAddOns.length > 0) {
                addOnsTotal = item.selectedAddOns.reduce((aSum, addOn) => aSum + (addOn.price || 0), 0);
            }
            const itemUnitTotal = price + addOnsTotal;
            return sum + (itemUnitTotal * quantity);
        }, 0);
    }
    computedTotal += order.deliveryFee ? order.deliveryFee : 0;
    document.getElementById('modalTotal').textContent = `₱${computedTotal.toFixed(2)}`;
    // Add contact number to summary section
    const summarySection = document.querySelector('.summary-section');
    if (summarySection && !document.getElementById('modalContactNumberSummary')) {
        const contactRow = document.createElement('div');
        contactRow.className = 'summary-row';
        contactRow.innerHTML = `<span>Contact Number</span><span id="modalContactNumberSummary">${customerPhone || 'N/A'}</span>`;
        summarySection.insertBefore(contactRow, summarySection.firstChild);
    } else if (summarySection) {
        document.getElementById('modalContactNumberSummary').textContent = customerPhone || 'N/A';
    }
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
};

window.updateOrderStatus = function(orderId) {
    const order = loadedOrders.find(o => o._id === orderId);
    if (!order) {
        showGlobalNotification("Order not found.", "error");
        return;
    }
    // Set current status badge - Updated to include out-for-delivery
    const currentStatusSpan = document.getElementById('updateModalCurrentStatus');
    currentStatusSpan.className = 'badge';
    switch(order.status) {
        case 'preparing':
            currentStatusSpan.classList.add('bg-warning', 'text-dark');
            break;
        case 'ready':
            currentStatusSpan.classList.add('bg-info');
            break;
        case 'out-for-delivery':
            currentStatusSpan.classList.add('bg-primary');
            break;
        case 'delivered':
            currentStatusSpan.classList.add('bg-success');
            break;
        case 'pending':
            currentStatusSpan.classList.add('bg-secondary');
            break;
        case 'cancelled':
            currentStatusSpan.classList.add('bg-danger');
            break;
        default:
            currentStatusSpan.classList.add('bg-secondary');
    }
    currentStatusSpan.textContent = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ') : "N/A";
    // Set select to current status
    const statusSelect = document.getElementById('updateModalNewStatus');
    statusSelect.value = order.status || 'pending';
    // Store orderId for confirm
    statusSelect.setAttribute('data-order-id', orderId);
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('updateOrderStatusModal'));
    modal.show();
};

document.addEventListener('DOMContentLoaded', function () {
    // Add event listener for confirm button
    document.getElementById('updateModalConfirmBtn').addEventListener('click', async function() {
        const statusSelect = document.getElementById('updateModalNewStatus');
        const newStatus = statusSelect.value;
        const orderId = statusSelect.getAttribute('data-order-id');
        try {
            const response = await fetch(`${API_BASE_URL}/mobile-orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            // Force reload the orders table to show updated status
            await loadMobileOrders();
            showSuccessModal(`Order status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace('-', ' ')}!`, newStatus);
            // Hide modal
            const modalEl = document.getElementById('updateOrderStatusModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } catch (error) {
            showGlobalNotification('Failed to update order status.', 'error');
        }
    });
}); 

// Pagination functionality
function renderPagination(total, page) {
    const paginationList = document.getElementById('paginationList');
    if (!paginationList) return;

    paginationList.innerHTML = '';
    
    if (total === 0) {
        return;
    }

    const totalPages = Math.ceil(total / ordersPerPage);
    
    if (totalPages <= 1) {
        return;
    }

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${page - 1})">Previous</a>`;
    paginationList.appendChild(prevLi);

    // Calculate page range to show
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);

    // Adjust range if we're near the beginning or end
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + 4);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
    }

    // First page and ellipsis if needed
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(1)">1</a>`;
        paginationList.appendChild(firstLi);

        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationList.appendChild(ellipsisLi);
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === page ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
        paginationList.appendChild(li);
    }

    // Last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationList.appendChild(ellipsisLi);
        }

        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a>`;
        paginationList.appendChild(lastLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${page === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${page + 1})">Next</a>`;
    paginationList.appendChild(nextLi);
}

function changePage(page) {
    if (page < 1 || page > Math.ceil(totalOrders / ordersPerPage)) {
        return;
    }
    
    currentPage = page;
    displayOrders(filteredOrders);
}

// Add page size selector
function changePageSize(size) {
    ordersPerPage = parseInt(size);
    currentPage = 1; // Reset to first page
    displayOrders(filteredOrders);
}

// --- Socket.IO Real-Time Order Status Updates ---
// Updated to listen for kitchen updates and provide real-time sync

const socket = io(getSocketUrl()); // Using config system for socket URL

socket.on('connect', () => {
  console.log('Connected to Socket.IO server for mobile order updates');
});

// Listen for kitchen updates (when kitchen changes order status)
socket.on('kitchenUpdate', (data) => {
  console.log('Kitchen status update received:', data);
  // Reload orders to get the latest status
  loadMobileOrders();
  // Show global notification
  showOrderStatusUpdateNotification(data.orderId, data.status, 'kitchen');
});

// Also listen for general order status updates
socket.on('orderStatusUpdate', (data) => {
  console.log('Order status update received:', data);
  // Reload orders to get the latest status
  loadMobileOrders();
  // Show global notification
  showOrderStatusUpdateNotification(data.orderId, data.status, 'general');
});

function updateOrderStatusInUI(orderId, status) {
  // Find the order in the loaded orders array
  const orderIndex = loadedOrders.findIndex(order => order.orderId === orderId || order._id === orderId);
  if (orderIndex !== -1) {
    loadedOrders[orderIndex].status = status;
    // Re-apply filters and display
    applyFilters();
  }
}

// --- Sidebar Toggle Functionality ---
// Initialize sidebar functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarMenu = document.getElementById('sidebarMenu');
  const closeSidebar = document.getElementById('closeSidebar');
  const body = document.body;

  // Toggle sidebar on button click
  if (sidebarToggle && sidebarMenu) {
    sidebarToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      sidebarMenu.classList.toggle('show');
      body.classList.toggle('sidebar-open');
    });
  }
  
  // Close sidebar on close button click
  if (closeSidebar && sidebarMenu) {
    closeSidebar.addEventListener('click', function() {
      sidebarMenu.classList.remove('show');
      body.classList.remove('sidebar-open');
    });
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', function(e) {
    if (window.innerWidth < 768 && 
        sidebarMenu && 
        sidebarMenu.classList.contains('show') && 
        !sidebarMenu.contains(e.target) && 
        !sidebarToggle.contains(e.target)) {
      sidebarMenu.classList.remove('show');
      body.classList.remove('sidebar-open');
    }
  });

  // Handle window resize
  function handleResize() {
    if (window.innerWidth >= 768) {
      sidebarMenu.classList.remove('show');
      body.classList.remove('sidebar-open');
    }
  }

  window.addEventListener('resize', handleResize);
}); 