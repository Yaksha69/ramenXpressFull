// Global variables for pagination and filtering
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 10;

// API Configuration - using the config.js file
// Make sure config.js is loaded before this script

// Add test button for notifications (for development/testing)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Notification';
  testButton.className = 'btn btn-info btn-sm position-fixed';
  testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
  testButton.onclick = function() {
    showGlobalNotification('Test notification from Reports!', 'info');
  };
  document.body.appendChild(testButton);
}

// Improved response handler
function handleResponse(response) {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '../login.html';
      throw new Error('Session expired. Please login again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. You do not have permission to view this data.');
    }
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }
  return response.json();
}

// Connection test function
async function testBackendConnection() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user.token;
    
    if (!token) {
      console.warn('No authentication token found');
      return false;
    }
    
    const response = await fetch(`${getApiUrl()}/sales/all-sales`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Consider backend available if we get any response (even 401/403)
    return response.status < 500;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
}

// Function to update connection status
function updateConnectionStatus(status, message = '') {
  const statusElement = document.getElementById('connectionStatus');
  if (!statusElement) return;
  
  switch (status) {
    case 'connecting':
      statusElement.className = 'badge bg-secondary';
      statusElement.innerHTML = '<i class="fas fa-wifi me-1"></i> Connecting...';
      break;
    case 'connected':
      statusElement.className = 'badge bg-success';
      statusElement.innerHTML = '<i class="fas fa-check-circle me-1"></i> Connected';
      break;
    case 'error':
      statusElement.className = 'badge bg-danger';
      statusElement.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i> ${message || 'Connection Error'}`;
      break;
    case 'offline':
      statusElement.className = 'badge bg-warning';
      statusElement.innerHTML = '<i class="fas fa-unlink me-1"></i> Offline';
      break;
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = user.token;

  // Initialize connection status
  updateConnectionStatus('connecting');

  // Show loading state
  const tbody = document.getElementById('salesTableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="mt-2">Loading transactions...</div>
      </td>
    </tr>
  `;

  // Test backend connection first
  const isBackendAvailable = await testBackendConnection();
  if (!isBackendAvailable) {
    updateConnectionStatus('offline');
    const apiUrl = getApiUrl();
    const isProduction = !API_CONFIG.DEV_MODE;
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          <i class="fas fa-unlink fa-2x mb-2"></i>
          <div><strong>Connection Failed</strong></div>
          <small class="text-muted">
            Unable to connect to ${isProduction ? 'production server' : 'local server'}<br>
            ${apiUrl}<br>
            ${!token ? 'Authentication token missing - please login again' : 'Server may be offline or unreachable'}
          </small>
          <br>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="window.location.reload()">
              <i class="fas fa-sync-alt me-1"></i> Retry
            </button>
            ${!token ? '<button class="btn btn-sm btn-warning" onclick="window.location.href=\'../login.html\'"><i class="fas fa-sign-in-alt me-1"></i> Login</button>' : ''}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Fetch both sales and mobile orders with improved error handling
  Promise.allSettled([
    fetch(`${getApiUrl()}/sales/all-sales`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).then(handleResponse),
    fetch(`${getApiUrl()}/mobile-orders/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).then(handleResponse)
  ])
    .then(([salesResult, mobileOrdersResult]) => {
      let salesData = [];
      let mobileOrdersData = [];
      let errors = [];

      // Process sales result
      if (salesResult.status === 'fulfilled') {
        if (Array.isArray(salesResult.value)) {
          salesData = salesResult.value;
        } else {
          errors.push('Unexpected sales response format');
        }
      } else {
        errors.push(`Sales: ${salesResult.reason.message}`);
      }

      // Process mobile orders result
      if (mobileOrdersResult.status === 'fulfilled') {
        if (Array.isArray(mobileOrdersResult.value)) {
          mobileOrdersData = mobileOrdersResult.value;
        } else {
          errors.push('Unexpected mobile orders response format');
        }
      } else {
        errors.push(`Mobile Orders: ${mobileOrdersResult.reason.message}`);
      }

      // Show warning if there were partial errors
      if (errors.length > 0 && (salesData.length > 0 || mobileOrdersData.length > 0)) {
        console.warn('Partial data loaded with errors:', errors);
        // You could show a warning toast here
      }

      // Process and combine data
      let totalRevenue = 0;
      let totalOrders = 0;
      let orderTypeCounts = { 'dine-in': 0, 'pickup': 0, 'delivery': 0 };

      console.log('Processing sales data:', salesData.length, 'records');
      console.log('Processing mobile orders data:', mobileOrdersData.length, 'records');

      // Process sales data
      console.log('Processing sales data - first item:', salesData[0]);
      salesData.forEach(sale => {
        const items = [];
        
        // Handle main menu item
        const mainItemName = sale.menuItem && sale.menuItem.name ? sale.menuItem.name : 
                            sale.menuItemName || 'Unknown Item';
        const mainItemPrice = sale.price || 0;
        const mainItemTotal = mainItemPrice * sale.quantity;
        items.push({
          name: mainItemName,
          quantity: sale.quantity,
          price: mainItemPrice,
          total: mainItemTotal,
          type: 'main'
        });
        
        // Handle add-ons
        if (Array.isArray(sale.addOns)) {
          sale.addOns.forEach(addOn => {
            const addOnName = addOn.menuItem && addOn.menuItem.name ? addOn.menuItem.name : 
                             addOn.menuItemName || 'Unknown Add-on';
            const addOnPrice = addOn.price || 0;
            const addOnQuantity = addOn.quantity || 1;
            const addOnTotal = addOnPrice * addOnQuantity;
            items.push({
              name: addOnName,
              quantity: addOnQuantity,
              price: addOnPrice,
              total: addOnTotal,
              type: 'addon'
            });
          });
        }

        const totalPrice = sale.totalAmount || (sale.price * sale.quantity);
        const date = (sale.createdAt || sale.date || '').slice(0, 10);
        const orderType = sale.serviceType || 'pickup';
        
        // Count order types
        if (orderType === 'dine-in') orderTypeCounts['dine-in']++;
        else orderTypeCounts['pickup']++;

        totalRevenue += totalPrice;
        totalOrders++;

        allTransactions.push({
          id: sale.orderID || sale._id,
          type: orderType,
          items: items,
          itemsString: items.map(item => `${item.name} x${item.quantity}`).join(', '),
          totalPrice: totalPrice,
          date: date,
          source: 'sales',
          originalData: sale
        });
      });

      // Process mobile orders data
      console.log('Processing mobile orders data - first item:', mobileOrdersData[0]);
      mobileOrdersData.forEach(order => {
        const items = [];
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            // Main item
            if (item.menuItem && item.menuItem.name) {
              const itemPrice = item.menuItem.price || 0;
              const itemTotal = itemPrice * item.quantity;
              items.push({
                name: item.menuItem.name,
                quantity: item.quantity,
                price: itemPrice,
                total: itemTotal,
                type: 'main'
              });
            }
            // Add-ons
            if (Array.isArray(item.selectedAddOns)) {
              item.selectedAddOns.forEach(addOn => {
                const addOnPrice = addOn.price || 0;
                items.push({
                  name: addOn.name,
                  quantity: 1,
                  price: addOnPrice,
                  total: addOnPrice,
                  type: 'addon'
                });
              });
            }
          });
        }

        const totalPrice = order.total || 0;
        const date = (order.createdAt || order.orderDate || '').slice(0, 10);
        const orderType = order.deliveryMethod === 'Delivery' ? 'delivery' : 'pickup';
        
        // Count order types
        if (orderType === 'delivery') orderTypeCounts['delivery']++;
        else orderTypeCounts['pickup']++;

        totalRevenue += totalPrice;
        totalOrders++;

        allTransactions.push({
          id: order.orderId || order._id,
          type: orderType,
          items: items,
          itemsString: items.map(item => `${item.name} x${item.quantity}`).join(', '),
          totalPrice: totalPrice,
          date: date,
          source: 'mobile',
          originalData: order
        });
      });

      console.log('Combined data summary:', {
        totalTransactions: allTransactions.length,
        totalRevenue,
        totalOrders,
        orderTypeCounts
      });

      console.log('Debug - Sales data count:', salesData.length);
      console.log('Debug - Mobile orders count:', mobileOrdersData.length);
      console.log('Debug - Total orders calculated:', totalOrders);

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      filteredTransactions = [...allTransactions]; // Initialize filtered transactions

      // Update connection status to connected
      updateConnectionStatus('connected');

      // Update summary cards - use allTransactions.length as fallback for totalOrders
      const finalTotalOrders = totalOrders > 0 ? totalOrders : allTransactions.length;
      
      // Calculate date range from the data
      const dateRange = calculateDateRange(allTransactions);
      updateSummaryCards(totalRevenue, finalTotalOrders, orderTypeCounts, dateRange);

      // Display transactions with pagination
      displayTransactionsWithPagination(filteredTransactions);

      // Show success message if no transactions
      if (allTransactions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted">
              <i class="fas fa-inbox fa-2x mb-2"></i>
              <div>No transactions found</div>
            </td>
          </tr>
        `;
      }

      // Show partial data warning if needed
      if (errors.length > 0 && allTransactions.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning alert-dismissible fade show';
        warningDiv.innerHTML = `
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Partial Data Loaded:</strong> ${errors.join(', ')}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.main-content').insertBefore(warningDiv, document.querySelector('.main-content').firstChild);
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      // Update connection status to error
      updateConnectionStatus('error', 'Load Error');
      
      // Show detailed error message to user
      const isAuthError = error.message.includes('401') || error.message.includes('403') || error.message.includes('Session expired');
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
            <div><strong>Error Loading Data</strong></div>
            <div class="mt-2">${error.message}</div>
            <small class="text-muted">
              ${isAuthError ? 'Please login again to access reports' : 'Check your connection and server status'}
            </small>
            <br>
            <div class="mt-3">
              <button class="btn btn-sm btn-outline-primary me-2" onclick="window.location.reload()">
                <i class="fas fa-sync-alt me-1"></i> Retry
              </button>
              ${isAuthError ? '<button class="btn btn-sm btn-warning" onclick="window.location.href=\'../login.html\'"><i class="fas fa-sign-in-alt me-1"></i> Login</button>' : ''}
            </div>
          </td>
        </tr>
      `;
    });
});

// Function to calculate date range from transactions
function calculateDateRange(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'No Data';
  }
  
  // Get all dates and sort them
  const dates = transactions
    .map(t => t.date)
    .filter(date => date && date !== '')
    .sort();
  
  if (dates.length === 0) {
    return 'No Dates';
  }
  
  const earliestDate = dates[0];
  const latestDate = dates[dates.length - 1];
  
  // Format dates for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  if (earliestDate === latestDate) {
    return formatDate(earliestDate);
  } else {
    return `${formatDate(earliestDate)} - ${formatDate(latestDate)}`;
  }
}

function updateSummaryCards(totalRevenue, totalOrders, orderTypeCounts, dateRange = 'Date Range') {
  try {
    console.log('updateSummaryCards called with:', {
      totalRevenue,
      totalOrders,
      orderTypeCounts
    });

    // Update Total Sales (first card) - find by looking for the "Total Sales" text
    const totalSalesCards = document.querySelectorAll('.summary-card');
    let totalSalesElement = null;
    for (let card of totalSalesCards) {
      const span = card.querySelector('span.text-primary');
      if (span && span.textContent.includes('Total Sales')) {
        totalSalesElement = card.querySelector('.stat');
        break;
      }
    }
    
    if (totalSalesElement) {
      totalSalesElement.textContent = `₱${totalRevenue.toFixed(0)}`;
      // Update the description with date range
      const descElement = totalSalesElement.parentElement.querySelector('.desc');
      if (descElement) {
        descElement.textContent = dateRange;
      }
      console.log('Updated Total Sales to:', `₱${totalRevenue.toFixed(0)}`);
    } else {
      console.error('Total Sales element not found');
    }
    
    // Update Total Orders (second card) - find by looking for the "Total Orders" text
    const totalOrdersCards = document.querySelectorAll('.summary-card');
    let totalOrdersElement = null;
    for (let card of totalOrdersCards) {
      const span = card.querySelector('span.text-warning');
      if (span && span.textContent.includes('Total Orders')) {
        totalOrdersElement = card.querySelector('.stat');
        break;
      }
    }
    
    if (totalOrdersElement) {
      totalOrdersElement.textContent = totalOrders;
      // Update the description with date range
      const descElement = totalOrdersElement.parentElement.querySelector('.desc');
      if (descElement) {
        descElement.textContent = dateRange;
      }
      console.log('Updated Total Orders to:', totalOrders);
    } else {
      console.error('Total Orders element not found');
    }
    
    // Update Order Types (third card) - find by looking for the "Order Type" text
    const orderTypeCards = document.querySelectorAll('.summary-card');
    let orderTypeCard = null;
    for (let card of orderTypeCards) {
      const span = card.querySelector('span.text-purple');
      if (span && span.textContent.includes('Order Type')) {
        orderTypeCard = card;
        break;
      }
    }
    
    if (orderTypeCard) {
      const orderTypeStats = orderTypeCard.querySelector('.d-flex.justify-content-between.mb-1');
      const orderTypeDesc = orderTypeCard.querySelector('.d-flex.justify-content-between.desc');
      
      if (orderTypeStats) {
        orderTypeStats.innerHTML = `
          <span class="stat">${orderTypeCounts['dine-in'] || 0}</span>
          <span class="stat">${orderTypeCounts['pickup'] || 0}</span>
          <span class="stat">${orderTypeCounts['delivery'] || 0}</span>
        `;
        console.log('Updated Order Types to:', orderTypeCounts);
      } else {
        console.error('Order Type stats element not found');
      }
      
      if (orderTypeDesc) {
        orderTypeDesc.innerHTML = `
          <span>Dine In</span>
          <span>Pick Up</span>
          <span>Delivery</span>
        `;
      } else {
        console.error('Order Type desc element not found');
      }
    } else {
      console.error('Order Type card not found');
    }
    
    // Update Average Order Value (fourth card)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgOrderValueElement = document.getElementById('avgOrderValue');
    if (avgOrderValueElement) {
      avgOrderValueElement.textContent = `₱${avgOrderValue.toFixed(0)}`;
    }
    
    console.log('Summary cards updated successfully:', {
      totalSales: totalRevenue.toFixed(0),
      totalOrders,
      orderTypeCounts,
      avgOrderValue: avgOrderValue.toFixed(0)
    });
    
  } catch (error) {
    console.error('Error updating summary cards:', error);
  }
}

function displayTransactionsWithPagination(transactions) {
  const tbody = document.getElementById('salesTableBody');
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  
  // Calculate start and end indices for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);
  
  tbody.innerHTML = '';

  if (currentTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="fas fa-search fa-2x mb-2"></i>
          <div>No transactions match your filters</div>
        </td>
      </tr>
    `;
    updatePaginationControls(0, 0);
    return;
  }

  currentTransactions.forEach(transaction => {
        const row = document.createElement('tr');
    const sourceBadge = transaction.source === 'mobile' ? 
      '<span class="badge bg-info me-1">Mobile</span>' : 
      '<span class="badge bg-success me-1">POS</span>';
    
        // Count the number of items
        const itemCount = transaction.items ? transaction.items.length : 0;
    
        row.innerHTML = `
      <td>${sourceBadge}${transaction.id}</td>
      <td>${transaction.type}</td>
      <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
      <td>₱${transaction.totalPrice.toFixed(2)}</td>
      <td>${transaction.date}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openTransactionDetailsModal('${transaction.id}', '${transaction.type}', ${JSON.stringify(transaction.items).replace(/"/g, '&quot;')}, '₱${transaction.totalPrice.toFixed(2)}', '${transaction.date}', '${transaction.source}')">
              <i class="fas fa-eye"></i> View
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });

  // Update pagination controls
  updatePaginationControls(totalPages, transactions.length);
}

function updatePaginationControls(totalPages, totalItems) {
  const paginationContainer = document.querySelector('.pagination-container');
  if (!paginationContainer) {
    // Create pagination container if it doesn't exist
    const tableContainer = document.querySelector('.table-responsive');
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-container d-flex justify-content-between align-items-center mt-4';
    tableContainer.parentNode.insertBefore(paginationDiv, tableContainer.nextSibling);
  }

  const container = document.querySelector('.pagination-container');
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  container.innerHTML = `
    <div class="pagination-info">
      Showing ${startItem} to ${endItem} of ${totalItems} transactions
    </div>
    <nav aria-label="Page navigation">
      <ul class="pagination mb-0">
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
            <i class="fas fa-chevron-left"></i> Previous
          </a>
        </li>
        ${generatePageNumbers(currentPage, totalPages)}
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>
            Next <i class="fas fa-chevron-right"></i>
          </a>
        </li>
      </ul>
    </nav>
  `;
}

function generatePageNumbers(currentPage, totalPages) {
  let pageNumbers = '';
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        </li>
      `;
    }
  } else {
    // Show limited pages with ellipsis
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) {
        pageNumbers += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
          </li>
        `;
      }
      pageNumbers += `
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
        <li class="page-item">
          <a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a>
        </li>
      `;
    } else if (currentPage >= totalPages - 2) {
      pageNumbers += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="changePage(1)">1</a>
        </li>
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `;
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pageNumbers += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
          </li>
        `;
      }
    } else {
      pageNumbers += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="changePage(1)">1</a>
        </li>
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `;
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers += `
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
          </li>
        `;
      }
      pageNumbers += `
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
        <li class="page-item">
          <a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a>
        </li>
      `;
    }
  }
  
  return pageNumbers;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    displayTransactionsWithPagination(filteredTransactions);
  }
}

// Transaction Details Modal Function
function openTransactionDetailsModal(id, type, items, totalPrice, date, source) {
  // Populate modal with transaction details
  document.getElementById("modalTransactionId").textContent = id;
  document.getElementById("modalOrderType").textContent = type;
  document.getElementById("modalTotalPrice").textContent = totalPrice;
  document.getElementById("modalDate").textContent = date;
  document.getElementById("modalSource").textContent = source === 'mobile' ? 'Mobile Order' : 'POS Sale';

  // Categorize items with price information
  const categorizedItems = categorizeItemsWithPrices(items);
  displayCategorizedItemsWithPrices(categorizedItems);

  // Show the modal
  const salesDetailsModal = new bootstrap.Modal(document.getElementById("salesDetailsModal"));
  salesDetailsModal.show();
}

// Function to categorize items with price information
function categorizeItemsWithPrices(items) {
  const categories = {
    'Main Items': [],
    'Add-ons': []
  };

  items.forEach((item, index) => {
    // First item is always the main menu item
    if (index === 0) {
      categories['Main Items'].push(item);
    } else {
      // All other items are add-ons
      categories['Add-ons'].push(item);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(category => {
    if (categories[category].length === 0) {
      delete categories[category];
    }
  });

  return categories;
}

// Function to categorize items based on their names (legacy)
function categorizeItems(itemsString) {
  const items = itemsString.split(', ').filter(item => item.trim() !== '');
  const categories = {
    'Main Items': [],
    'Add-ons': []
  };

  items.forEach((item, index) => {
    const itemName = item.toLowerCase();
    
    // First item is always the main menu item
    if (index === 0) {
      categories['Main Items'].push(item);
    } else {
      // All other items are add-ons
      categories['Add-ons'].push(item);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(category => {
    if (categories[category].length === 0) {
      delete categories[category];
    }
  });

  return categories;
}

// Function to display categorized items with prices in the modal
function displayCategorizedItemsWithPrices(categorizedItems) {
  const modalItemsDiv = document.getElementById("modalItems");
  
  if (Object.keys(categorizedItems).length === 0) {
    modalItemsDiv.innerHTML = '<div class="text-muted">No items found</div>';
    return;
  }

  let html = '';
  
  // Define the order of categories to display
  const categoryOrder = ['Main Items', 'Add-ons'];
  
  categoryOrder.forEach(category => {
    if (categorizedItems[category] && categorizedItems[category].length > 0) {
      const iconClass = category === 'Main Items' ? 'fas fa-utensils' : 'fas fa-plus';
      const iconColor = category === 'Main Items' ? 'text-primary' : 'text-success';
      
      html += `
        <div class="mb-3">
          <h6 class="fw-semibold text-dark mb-2">
            <i class="${iconClass} me-1 ${iconColor}"></i>${category}
          </h6>
          <ul class="list-unstyled mb-0">
      `;
      
      categorizedItems[category].forEach(item => {
        const itemDisplay = `${item.name} x${item.quantity}`;
        const priceDisplay = `₱${item.total.toFixed(2)}`;
        
        html += `
          <li class="mb-2 d-flex justify-content-between align-items-center">
            <div>
              <i class="fas fa-circle me-2" style="font-size: 0.5rem; color: #6c757d;"></i>
              <span class="text-dark">${itemDisplay}</span>
            </div>
            <div class="text-end">
              <small class="text-muted">${priceDisplay}</small>
            </div>
          </li>
        `;
      });
      
      html += `
          </ul>
        </div>
      `;
    }
  });

  modalItemsDiv.innerHTML = html;
}

// Function to display categorized items in the modal (legacy)
function displayCategorizedItems(categorizedItems) {
  const modalItemsDiv = document.getElementById("modalItems");
  
  if (Object.keys(categorizedItems).length === 0) {
    modalItemsDiv.innerHTML = '<div class="text-muted">No items found</div>';
    return;
  }

  let html = '';
  
  // Define the order of categories to display
  const categoryOrder = ['Main Items', 'Add-ons'];
  
  categoryOrder.forEach(category => {
    if (categorizedItems[category] && categorizedItems[category].length > 0) {
      const iconClass = category === 'Main Items' ? 'fas fa-utensils' : 'fas fa-plus';
      const iconColor = category === 'Main Items' ? 'text-primary' : 'text-success';
      
      html += `
        <div class="mb-3">
          <h6 class="fw-semibold text-dark mb-2">
            <i class="${iconClass} me-1 ${iconColor}"></i>${category}
          </h6>
          <ul class="list-unstyled mb-0">
      `;
      
      categorizedItems[category].forEach(item => {
        html += `
          <li class="mb-1">
            <i class="fas fa-circle me-2" style="font-size: 0.5rem; color: #6c757d;"></i>
            <span class="text-dark">${item}</span>
          </li>
        `;
      });
      
      html += `
          </ul>
        </div>
      `;
    }
  });

  modalItemsDiv.innerHTML = html;
}

// Search and filter functionality
function filterTransactions() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const startDate = document.getElementById('filterStartDate').value;
  const endDate = document.getElementById('filterEndDate').value;
  const orderType = document.getElementById('filterOrderType').value;
  
  // Filter transactions
  filteredTransactions = allTransactions.filter(transaction => {
    const id = transaction.id.toLowerCase();
    const type = transaction.type.toLowerCase();
    const items = transaction.itemsString.toLowerCase();
    const date = transaction.date;
    
    const matchesSearch = id.includes(searchTerm) || type.includes(searchTerm) || items.includes(searchTerm);
    const matchesDate = (!startDate || date >= startDate) && (!endDate || date <= endDate);
    const matchesOrderType = !orderType || type === orderType;
    
    return matchesSearch && matchesDate && matchesOrderType;
  });

  // Reset to first page when filtering
  currentPage = 1;
  
  // Recalculate summary cards with filtered data
  let filteredRevenue = 0;
  let filteredOrders = 0;
  let filteredOrderTypeCounts = { 'dine-in': 0, 'pickup': 0, 'delivery': 0 };
  
  filteredTransactions.forEach(transaction => {
    filteredRevenue += transaction.totalPrice;
    filteredOrders++;
    if (transaction.type === 'dine-in') filteredOrderTypeCounts['dine-in']++;
    else if (transaction.type === 'delivery') filteredOrderTypeCounts['delivery']++;
    else filteredOrderTypeCounts['pickup']++;
  });
  
  // Calculate date range from filtered data
  const filteredDateRange = calculateDateRange(filteredTransactions);
  updateSummaryCards(filteredRevenue, filteredOrders, filteredOrderTypeCounts, filteredDateRange);
  
  // Display filtered results
  displayTransactionsWithPagination(filteredTransactions);
}

// Add event listeners for search and filter
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');
  const filterOrderType = document.getElementById('filterOrderType');
  
  if (searchInput) {
    searchInput.addEventListener('input', filterTransactions);
  }
  
  if (filterStartDate) {
    filterStartDate.addEventListener('change', filterTransactions);
  }
  
  if (filterEndDate) {
    filterEndDate.addEventListener('change', filterTransactions);
  }
  
  if (filterOrderType) {
    filterOrderType.addEventListener('change', filterTransactions);
  }
});

// Download functionality
function downloadReports() {
  if (filteredTransactions.length === 0) {
    alert('No data to download');
    return;
  }
  
  const csvContent = generateCSV(filteredTransactions);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function generateCSV(transactions) {
  const headers = ['Transaction ID', 'Source', 'Order Type', 'Items', 'Total Price', 'Date'];
  const rows = transactions.map(transaction => [
    transaction.id,
    transaction.source === 'mobile' ? 'Mobile Order' : 'POS Sale',
    transaction.type,
    transaction.itemsString || (transaction.items ? transaction.items.map(item => `${item.name} x${item.quantity}`).join(', ') : 'No items'),
    transaction.totalPrice.toFixed(2),
    transaction.date
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
    
  return csvContent;
}

// Add event listener for download button
document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadReports);
  }
});

// Debug information
console.log('Reports.js loaded successfully');
console.log('API Configuration:', {
  devMode: API_CONFIG?.DEV_MODE,
  apiUrl: typeof getApiUrl === 'function' ? getApiUrl() : 'getApiUrl not available'
});

// Expose to HTML onclick
window.openTransactionDetailsModal = openTransactionDetailsModal;