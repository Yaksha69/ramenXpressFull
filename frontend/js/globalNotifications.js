// Global Notification System using SweetAlert2
// This file provides consistent notification functionality across all pages

// Use API_BASE_URL from config.js
const API_BASE_URL = getApiUrl();

// Notification storage
let notifications = [];
let notificationCount = 0;
let isBackendConnected = false;

// Global notification function - Small toast style + store in dropdown
function showGlobalNotification(message, type = "info", title = null) {
    // Show toast notification
    const config = {
        position: "top-end",
        icon: type,
        title: title || message,
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        toast: true,
        customClass: {
            popup: 'swal2-toast-small'
        }
    };

    Swal.fire(config);
    
    // Store notification in dropdown
    addNotificationToDropdown({
        id: Date.now(),
        type: type,
        title: title || message,
        message: message,
        timestamp: new Date(),
        read: false
    });
}

// Add notification to dropdown and storage
function addNotificationToDropdown(notification) {
    console.log('Adding notification to dropdown:', notification);
    console.log('Current notifications count before:', notifications.length);
    
    notifications.unshift(notification); // Add to beginning
    notificationCount++;
    
    console.log('Current notifications count after:', notifications.length);
    console.log('Notification count:', notificationCount);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
    }
    
    // Update UI
    updateNotificationDropdown();
    updateNotificationBadge();
}

// Fetch notifications from backend API
async function fetchNotificationsFromBackend() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.log('No auth token found, skipping notification fetch');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            notifications = data.notifications || [];
            notificationCount = notifications.filter(n => !n.isRead).length;
            isBackendConnected = true;
            updateNotificationDropdown();
            updateNotificationBadge();
        } else {
            console.error('Failed to fetch notifications:', response.status);
            isBackendConnected = false;
            
            // Fallback to localStorage
            const localNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications = localNotifications;
            notificationCount = notifications.filter(n => !n.read).length;
            updateNotificationDropdown();
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        isBackendConnected = false;
        
        // Show user-friendly message if backend is not available
        if (error.message.includes('ERR_CONNECTION_RESET') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
            console.warn('Backend server is not running. Notifications will work in offline mode.');
            showGlobalNotification('Backend server is not running. Some features may not work properly.', 'warning', 'Server Connection');
        }
        
        // Fallback to localStorage
        const localNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        notifications = localNotifications;
        notificationCount = notifications.filter(n => !n.read).length;
        updateNotificationDropdown();
        updateNotificationBadge();
    }
}

// Mark notification as read on backend
async function markNotificationAsReadBackend(notificationId) {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Update local state
            const notification = notifications.find(n => n._id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                notificationCount = Math.max(0, notificationCount - 1);
                updateNotificationDropdown();
                updateNotificationBadge();
            }
        }
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Mark all notifications as read on backend
async function markAllNotificationsAsReadBackend() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Update local state
            notifications.forEach(notification => {
                notification.isRead = true;
            });
            notificationCount = 0;
            updateNotificationDropdown();
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
    }
}

// Update notification dropdown content
function updateNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    notificationList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-bell-slash fa-2x mb-2"></i>
                <p class="mb-0">No notifications</p>
            </div>
        `;
        return;
    }
    
    notifications.forEach(notification => {
        const notificationItem = createNotificationItem(notification);
        notificationList.appendChild(notificationItem);
    });
}

// Create individual notification item
function createNotificationItem(notification) {
    const item = document.createElement('div');
    const notificationId = notification._id || notification.id; // Handle both backend and local IDs
    const isRead = notification.isRead !== undefined ? notification.isRead : !notification.read; // Handle both backend and local read status
    const timestamp = notification.createdAt || notification.timestamp; // Handle both backend and local timestamps
    
    item.className = `notification-item ${!isRead ? 'unread' : ''}`;
    item.onclick = () => markNotificationAsRead(notificationId);
    
    const iconClass = getNotificationIcon(notification.type);
    const timeAgo = getTimeAgo(timestamp);
    
    item.innerHTML = `
        <div class="d-flex align-items-start">
            <div class="notification-icon me-3">
                <i class="fas ${iconClass} text-${notification.type === 'error' ? 'danger' : notification.type === 'success' ? 'success' : notification.type === 'warning' ? 'warning' : 'info'}"></i>
            </div>
            <div class="notification-content flex-grow-1">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
            ${!isRead ? '<div class="notification-dot"></div>' : ''}
        </div>
    `;
    
    return item;
}

// Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    if (isBackendConnected) {
        markNotificationAsReadBackend(notificationId);
    } else {
        // Fallback to local storage
        const notification = notifications.find(n => (n._id || n.id) === notificationId);
        if (notification) {
            const isRead = notification.isRead !== undefined ? notification.isRead : !notification.read;
            if (!isRead) {
                if (notification.isRead !== undefined) {
                    notification.isRead = true;
                } else {
                    notification.read = true;
                }
                notificationCount = Math.max(0, notificationCount - 1);
                updateNotificationDropdown();
                updateNotificationBadge();
            }
        }
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    if (isBackendConnected) {
        markAllNotificationsAsReadBackend();
    } else {
        // Fallback to local storage
        notifications.forEach(notification => {
            notification.read = true;
        });
        notificationCount = 0;
        updateNotificationDropdown();
        updateNotificationBadge();
    }
}

// Update notification badge count
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (notificationCount > 0) {
        badge.textContent = notificationCount > 99 ? '99+' : notificationCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Show new mobile order notification - Small toast style + store in dropdown
function showNewMobileOrderNotification(order) {
    const customerName = getCustomerDisplayName(order);
    const orderId = order.orderId || order._id;
    const total = order.total ? order.total.toFixed(2) : "0.00";
    
    // Show toast notification
    Swal.fire({
        position: "top-end",
        icon: "info",
        title: `🛍️ New Order #${orderId}`,
        text: `${customerName} - ₱${total}`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        toast: true,
        customClass: {
            popup: 'swal2-toast-small'
        }
    });
    
    // Store in dropdown
    addNotificationToDropdown({
        id: Date.now(),
        type: 'info',
        title: `🛍️ New Order #${orderId}`,
        message: `${customerName} - ₱${total}`,
        timestamp: new Date(),
        read: false
    });
}

// Show order status update notification - Small toast style + store in dropdown
function showOrderStatusUpdateNotification(orderId, status, source = 'general') {
    const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
    
    // Determine icon based on status
    let icon = 'info';
    
    switch (status) {
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
        default:
            icon = 'info';
    }
    
    // Show toast notification
    Swal.fire({
        position: "top-end",
        icon: icon,
        title: `📋 Order #${orderId}`,
        text: `Status: ${statusDisplay}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        toast: true,
        customClass: {
            popup: 'swal2-toast-small'
        }
    });
    
    // Store in dropdown
    addNotificationToDropdown({
        id: Date.now(),
        type: icon,
        title: `📋 Order #${orderId}`,
        message: `Status: ${statusDisplay}`,
        timestamp: new Date(),
        read: false
    });
}

// Helper function to get customer display name
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

// Global socket connection for real-time notifications
let globalSocket = null;

// Initialize global socket connection
function initializeGlobalSocket() {
    console.log('🔌 Initializing Socket.IO connection...');
    console.log('Socket URL:', getSocketUrl());
    console.log('io available:', typeof io !== 'undefined');
    
    if (typeof io !== 'undefined') {
        globalSocket = io(getSocketUrl(), {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });
        
        globalSocket.on('connect', () => {
            console.log('✅ Global Socket.IO connected for notifications');
            console.log('Socket ID:', globalSocket.id);
            console.log('Socket URL:', getSocketUrl());
        });
        
        globalSocket.on('disconnect', (reason) => {
            console.log('❌ Global Socket.IO disconnected:', reason);
        });
        
        globalSocket.on('connect_error', (error) => {
            console.error('❌ Socket.IO connection error:', error);
            console.error('Socket URL:', getSocketUrl());
        });
        
        globalSocket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
        });
        
        globalSocket.on('reconnect_error', (error) => {
            console.error('❌ Socket.IO reconnection error:', error);
        });

        // Listen for new mobile orders
        globalSocket.on('newMobileOrder', (order) => {
            console.log('New mobile order received:', order);
            showNewMobileOrderNotification(order);
            
            // If notification data is included, add to dropdown
            if (order.notification) {
                console.log('Adding new mobile order notification to dropdown:', order.notification);
                addNotificationToDropdown(order.notification);
            } else {
                console.log('No notification data in newMobileOrder event');
            }
        });

        // Listen for kitchen updates
        globalSocket.on('kitchenUpdate', (data) => {
            console.log('Kitchen status update received:', data);
            showOrderStatusUpdateNotification(data.orderId, data.status, 'kitchen');
            
            // If notification data is included, add to dropdown
            if (data.notification) {
                console.log('Adding kitchen notification to dropdown:', data.notification);
                addNotificationToDropdown(data.notification);
            }
        });

        // Listen for general order status updates
        globalSocket.on('orderStatusUpdate', (data) => {
            console.log('Order status update received:', data);
            showOrderStatusUpdateNotification(data.orderId, data.status, 'general');
            
            // If notification data is included, add to dropdown
            if (data.notification) {
                console.log('Adding order status notification to dropdown:', data.notification);
                addNotificationToDropdown(data.notification);
            }
        });

        // Listen for inventory updates
        globalSocket.on('inventoryUpdate', (data) => {
            console.log('Inventory update received:', data);
            
            // Show toast notification
            if (data.stocks <= 0) {
                showGlobalNotification(`${data.itemName} is now out of stock!`, 'warning', 'Out of Stock Alert');
            } else {
                showGlobalNotification(`${data.itemName} is running low (${data.stocks} remaining)`, 'warning', 'Low Stock Alert');
            }
            
            // If notification data is included, add to dropdown
            if (data.notification) {
                console.log('Adding inventory notification to dropdown:', data.notification);
                addNotificationToDropdown(data.notification);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeGlobalSocket();
    initializeNotificationDropdown();
    fetchNotificationsFromBackend(); // Fetch from backend on page load
});

// Initialize notification dropdown
function initializeNotificationDropdown() {
    console.log('Initializing notification dropdown...');
    console.log('Notification dropdown element:', document.getElementById('notificationDropdown'));
    console.log('Notification list element:', document.getElementById('notificationList'));
    console.log('Notification badge element:', document.getElementById('notificationBadge'));
    
    // Update notification count on page load
    updateNotificationBadge();
    updateNotificationDropdown();
}

// Periodic fetch from backend (every 30 seconds)
setInterval(() => {
    if (isBackendConnected) {
        fetchNotificationsFromBackend();
    }
}, 30000);

// Test function for debugging
function testNotification() {
    console.log('🧪 Testing notification system...');
    showGlobalNotification('Test notification from system!', 'success', 'Test');
    
    // Add a test notification to dropdown
    addNotificationToDropdown({
        _id: 'test_' + Date.now(),
        type: 'success',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working',
        isRead: false,
        createdAt: new Date()
    });
}

// Test function for mobile order notification
function testMobileOrderNotification() {
    console.log('🧪 Testing mobile order notification...');
    const testOrder = {
        orderId: 'TEST' + Math.floor(Math.random() * 1000),
        customerName: 'Test Customer',
        total: 150.00,
        paymentMethod: 'GCash'
    };
    showNewMobileOrderNotification(testOrder);
}

// Test function for status update notification
function testStatusUpdateNotification() {
    console.log('🧪 Testing status update notification...');
    showOrderStatusUpdateNotification('TEST123', 'ready', 'general');
}

// Test function for inventory notification
function testInventoryNotification() {
    console.log('🧪 Testing inventory notification...');
    const mockInventoryData = {
        itemId: 'test123',
        itemName: 'Test Ingredient',
        stocks: 0,
        status: 'out of stock',
        notification: {
            _id: 'test-notification-' + Date.now(),
            type: 'warning',
            title: '⚠️ Out of Stock Alert',
            message: 'Test Ingredient is now out of stock',
            isRead: false,
            createdAt: new Date().toISOString()
        }
    };
    
    console.log('Testing inventory notification:', mockInventoryData);
    
    // Manually trigger the inventory update handler
    if (globalSocket) {
        console.log('Socket connected, emitting inventory update event');
        globalSocket.emit('inventoryUpdate', mockInventoryData);
    } else {
        console.warn('Socket not connected, manually triggering inventory update');
        // Manually call the inventory update handler
        const event = new CustomEvent('inventoryUpdate', { detail: mockInventoryData });
        window.dispatchEvent(event);
    }
}

// Test function for order processing notification
function testOrderProcessingNotification() {
    console.log('🧪 Testing order processing notification...');
    const mockOrderData = {
        itemId: 'test456',
        itemName: 'Noodles',
        stocks: 2,
        status: 'low stock',
        notification: {
            _id: 'test-order-notification-' + Date.now(),
            type: 'warning',
            title: '📉 Low Stock Alert',
            message: 'Noodles is running low (2 remaining) after order processing',
            isRead: false,
            createdAt: new Date().toISOString()
        }
    };
    
    console.log('Testing order processing notification:', mockOrderData);
    
    // Manually trigger the inventory update handler
    if (globalSocket) {
        console.log('Socket connected, emitting inventory update event');
        globalSocket.emit('inventoryUpdate', mockOrderData);
    } else {
        console.warn('Socket not connected, manually triggering inventory update');
        // Manually call the inventory update handler
        const event = new CustomEvent('inventoryUpdate', { detail: mockOrderData });
        window.dispatchEvent(event);
    }
}

// Export functions for use in other scripts
window.showGlobalNotification = showGlobalNotification;
window.showNewMobileOrderNotification = showNewMobileOrderNotification;
window.showOrderStatusUpdateNotification = showOrderStatusUpdateNotification;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.updateNotificationDropdown = updateNotificationDropdown;
window.testNotification = testNotification;
window.testMobileOrderNotification = testMobileOrderNotification;
window.testStatusUpdateNotification = testStatusUpdateNotification;
window.testInventoryNotification = testInventoryNotification;
window.testOrderProcessingNotification = testOrderProcessingNotification;
