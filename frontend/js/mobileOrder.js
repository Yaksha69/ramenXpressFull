// Mobile Order Management JavaScript

// Remove the ES6 import for socket.io-client
// import { io } from "socket.io-client";

const API_BASE_URL = getApiUrl();
const authToken = localStorage.getItem("authToken"); // For admin/cashier authentication

let loadedOrders = [];
let currentPage = 1;
let ordersPerPage = 10;
let totalOrders = 0;

// Helper function to get correct image URL from backend data
function getImageUrl(imagePath) {
  if (!imagePath) {
    return '../assets/ramen1.jpg'; // Default image
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
  
  // If it's just a filename (like uploaded images), it's a backend uploaded image
  if (!imagePath.includes('/') && imagePath.includes('.')) {
    return `${getUploadUrl()}/uploads/menus/${imagePath}`;
  }
  
  // If it's just a filename without extension, assume it's in assets
  if (!imagePath.includes('/')) {
    return `../assets/${imagePath}`;
  }
  
  // If it's any other path from backend, try to use it as is
  return imagePath;
}

document.addEventListener("DOMContentLoaded", function () {
    loadMobileOrders();
    // initializeFilters(); // Uncomment if you have filter logic
    window.addEventListener('focus', loadMobileOrders);
    setInterval(loadMobileOrders, 5000); // every 5 seconds
});

// Add order status filter buttons
function renderOrderStatusFilters(currentStatus) {
    const statuses = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'preparing', label: 'Preparing' },
        { key: 'ready', label: 'Ready' },
        { key: 'delivered', label: 'Delivered' },
        { key: 'cancelled', label: 'Cancelled' }
    ];
    const container = document.getElementById('orderStatusFilters');
    if (!container) return;
    container.innerHTML = '';
    statuses.forEach(status => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm me-2 mb-2 ' + (currentStatus === status.key ? 'btn-primary' : 'btn-outline-primary');
        btn.textContent = status.label;
        btn.onclick = () => {
            window.currentOrderStatusFilter = status.key;
            displayOrders(window.lastLoadedOrders || loadedOrders, status.key);
            renderOrderStatusFilters(status.key);
        };
        container.appendChild(btn);
    });
}

// Update displayOrders to accept a status filter
function displayOrders(orders, statusFilter = window.currentOrderStatusFilter || 'all') {
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

    // Filter orders by status
    let filteredOrders = orders;
    if (statusFilter && statusFilter !== 'all') {
        filteredOrders = orders.filter(order => order.status === statusFilter);
    }

    totalOrders = filteredOrders.length;

    // Calculate pagination
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Separate delivered and non-delivered orders (if not filtering for delivered)
    let nonDelivered = paginatedOrders;
    let delivered = [];
    if (statusFilter === 'all') {
        nonDelivered = paginatedOrders.filter(order => order.status !== 'delivered');
        delivered = paginatedOrders.filter(order => order.status === 'delivered');
    }

    // Show non-delivered orders first
    nonDelivered.forEach(order => {
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
        row.innerHTML = `
            <td>#${order.orderId || order._id}</td>
            <td>${customerName}</td>
            <td>${orderDate}</td>
            <td>₱${order.total ? order.total.toFixed(2) : "0.00"}</td>
            <td>${paymentBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails('${order._id}')">View</button>
                <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus('${order._id}')" ${isUpdateDisabled ? 'disabled' : ''}>Update</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // If there are delivered orders, add a separator row
    if (statusFilter === 'all' && delivered.length > 0) {
        const sepRow = document.createElement("tr");
        sepRow.innerHTML = `<td colspan="7" class="text-center text-success fw-bold bg-light">Delivered Orders</td>`;
        tbody.appendChild(sepRow);
    }

    // Show delivered orders below
    if (statusFilter === 'all') {
        delivered.forEach(order => {
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
            row.innerHTML = `
                <td>#${order.orderId || order._id}</td>
                <td>${customerName}</td>
                <td>${orderDate}</td>
                <td>₱${order.total ? order.total.toFixed(2) : "0.00"}</td>
                <td>${paymentBadge}</td>
                <td>${statusBadge}</td>
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

// Call this after loading orders
function afterOrdersLoaded() {
    renderOrderStatusFilters(window.currentOrderStatusFilter || 'all');
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
        loadedOrders = orders; // Store for modal use
        displayOrders(orders);
        afterOrdersLoaded();
    } catch (error) {
        console.error("Error loading mobile orders:", error);
        showNotification("Failed to load orders. Please check your connection.", "error");
    }
}

// Status badge
function getStatusBadge(status) {
    const map = {
        pending: '<span class="badge bg-secondary">Pending</span>',
        preparing: '<span class="badge bg-warning text-dark">Preparing</span>',
        ready: '<span class="badge bg-info">Ready</span>',
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

// Show notification
function showNotification(message, type = "info") {
    const alertClass = type === "error" ? "alert-danger" : type === "success" ? "alert-success" : "alert-info";
    const notification = document.createElement("div");
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 5000);
}

// Add a function to show a centered Bootstrap modal for success
function showSuccessModal(message, status) {
    // Remove any existing modal
    const existing = document.getElementById('successUpdateModal');
    if (existing) existing.remove();
    // Determine color based on status
    let color = 'success';
    let iconColor = 'success';
    switch ((status || '').toLowerCase()) {
        case 'preparing':
        case 'preparing':
            color = 'warning';
            iconColor = 'warning text-dark';
            break;
        case 'ready':
            color = 'info';
            iconColor = 'info';
            break;
        case 'delivered':
            color = 'success';
            iconColor = 'success';
            break;
        case 'cancelled':
            color = 'danger';
            iconColor = 'danger';
            break;
        case 'pending':
            color = 'secondary';
            iconColor = 'secondary';
            break;
        default:
            color = 'success';
            iconColor = 'success';
    }
    // Create modal HTML
    const modalHtml = `
    <div class="modal fade" id="successUpdateModal" tabindex="-1" aria-labelledby="successUpdateModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-${color} text-white">
            <h5 class="modal-title" id="successUpdateModalLabel">Success</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <i class="fas fa-check-circle fa-3x mb-3 text-${iconColor}"></i>
            <div class="fw-bold fs-5 mb-2">${message}</div>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('successUpdateModal'));
    modal.show();
    // Auto-hide after 2 seconds
    setTimeout(() => {
        modal.hide();
    }, 2000);
}

window.viewOrderDetails = async function(orderId) {
    await loadMobileOrders();
    const order = loadedOrders.find(o => o._id === orderId);
    if (!order) {
        showNotification("Order not found.", "error");
        return;
    }
    // Customer info
    let customerName = getCustomerDisplayName(order);
    let customerPhone = "";
    let customerAddress = order.deliveryAddress || "";
    
    // Get customer phone and address from populated customerId
    if (order.customerId && typeof order.customerId === 'object' && order.customerId !== null) {
        customerPhone = order.customerId.phone || "";
        // Note: Customer model doesn't have address field, so we use deliveryAddress from order
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
    // Set status classes
    switch(order.status) {
        case 'preparing':
        case 'preparing':
            orderStatusElement.classList.add('bg-warning', 'text-dark');
            break;
        case 'delivered':
            orderStatusElement.classList.add('bg-success');
            break;
        case 'pending':
            orderStatusElement.classList.add('bg-secondary');
            break;
        case 'ready':
            orderStatusElement.classList.add('bg-info');
            break;
        case 'cancelled':
            orderStatusElement.classList.add('bg-danger');
            break;
        default:
            orderStatusElement.classList.add('bg-secondary');
    }
    orderStatusElement.textContent = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "N/A";
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
            // Add-ons
            let addOnsHtml = '';
            let addOnsTotal = 0;
            if (item.selectedAddOns && item.selectedAddOns.length > 0) {
                addOnsHtml = '<ul class="mb-0 ps-3 small text-muted">';
                item.selectedAddOns.forEach(addOn => {
                    addOnsHtml += `<li>${addOn.name} (+₱${addOn.price.toFixed(2)})</li>`;
                    addOnsTotal += addOn.price;
                });
                addOnsHtml += '</ul>';
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
                            ${addOnsHtml}
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
        showNotification("Order not found.", "error");
        return;
    }
    // Set current status badge
    const currentStatusSpan = document.getElementById('updateModalCurrentStatus');
    currentStatusSpan.className = 'badge';
    switch(order.status) {
        case 'preparing':
            currentStatusSpan.classList.add('bg-warning', 'text-dark');
            break;
        case 'delivered':
            currentStatusSpan.classList.add('bg-success');
            break;
        case 'pending':
            currentStatusSpan.classList.add('bg-secondary');
            break;
        case 'ready':
            currentStatusSpan.classList.add('bg-info');
            break;
        case 'cancelled':
            currentStatusSpan.classList.add('bg-danger');
            break;
        default:
            currentStatusSpan.classList.add('bg-secondary');
    }
    currentStatusSpan.textContent = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "N/A";
    // Set select to current status
    const statusSelect = document.getElementById('updateModalNewStatus');
    statusSelect.value = order.status || 'pending';
    // Clear notes
    // document.getElementById('updateModalNotes').value = ''; // This line is removed as per the edit hint
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
        // Removed notes field
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
            // Instead of merging partial response, reload all orders to preserve customer info
            await loadMobileOrders();
            showSuccessModal(`Order status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}!`, newStatus);
            // Hide modal
            const modalEl = document.getElementById('updateOrderStatusModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } catch (error) {
            showNotification('Failed to update order status.', 'error');
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
    displayOrders(window.lastLoadedOrders || loadedOrders, window.currentOrderStatusFilter || 'all');
}

// Add page size selector
function changePageSize(size) {
    ordersPerPage = parseInt(size);
    currentPage = 1; // Reset to first page
    displayOrders(window.lastLoadedOrders || loadedOrders, window.currentOrderStatusFilter || 'all');
}

// --- Socket.IO Real-Time Order Status Updates ---
// If using modules, you may need: import { io } from 'socket.io-client';
// If not, ensure <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script> is in your HTML

const socket = io(getSocketUrl()); // Using config system for socket URL

socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
});

socket.on('orderStatusUpdate', (data) => {
  console.log('Order status update received:', data);
  // Call your UI update function here
  // Example:
  // updateOrderStatusInUI(data.orderId, data.status);
});

function updateOrderStatusInUI(orderId, status) {
  // Example: Find the order element by data-order-id and update its status
  const orderElem = document.querySelector(`[data-order-id='${orderId}']`);
  if (orderElem) {
    const statusElem = orderElem.querySelector('.order-status');
    if (statusElem) {
      statusElem.textContent = status;
      // Optionally update color, icon, etc.
    }
  }
} 