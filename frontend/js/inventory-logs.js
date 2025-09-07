// Inventory Logs JavaScript

// Sample log data (in a real app, this would come from an API)
let logsData = [
  {
    id: 1,
    timestamp: "2024-01-15 14:30:25",
    action: "ingredient_added",
    itemType: "Ingredient",
    itemName: "Tonkotsu Broth",
    details: "Added 50 units of Tonkotsu Broth",
    user: "Admin User"
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:25:10",
    action: "menu_added",
    itemType: "Menu Item",
    itemName: "Spicy Tonkotsu Ramen",
    details: "Added new menu item with 5 ingredients",
    user: "Admin User"
  },
  {
    id: 3,
    timestamp: "2024-01-15 14:20:45",
    action: "ingredient_updated",
    itemType: "Ingredient",
    itemName: "Chashu Pork",
    details: "Updated quantity from 20 to 35 units",
    user: "Admin User"
  },
  {
    id: 4,
    timestamp: "2024-01-15 14:15:30",
    action: "menu_updated",
    itemType: "Menu Item",
    itemName: "Miso Ramen",
    details: "Updated price from $12.99 to $13.99",
    user: "Admin User"
  },
  {
    id: 5,
    timestamp: "2024-01-15 14:10:15",
    action: "ingredient_added",
    itemType: "Ingredient",
    itemName: "Nori Sheets",
    details: "Added 100 units of Nori Sheets",
    user: "Admin User"
  },
  {
    id: 6,
    timestamp: "2024-01-15 14:05:00",
    action: "menu_deleted",
    itemType: "Menu Item",
    itemName: "Old Ramen Special",
    details: "Removed discontinued menu item",
    user: "Admin User"
  },
  {
    id: 7,
    timestamp: "2024-01-15 14:00:30",
    action: "ingredient_updated",
    itemType: "Ingredient",
    itemName: "Ramen Noodles",
    details: "Updated status from 'Low Stock' to 'In Stock'",
    user: "Admin User"
  },
  {
    id: 8,
    timestamp: "2024-01-15 13:55:20",
    action: "menu_added",
    itemType: "Menu Item",
    itemName: "Vegetable Ramen",
    details: "Added new vegetarian menu item",
    user: "Admin User"
  }
];

let currentLogsPage = 1;
let logsPerPage = 10;
let filteredLogs = [...logsData];

// Initialize logs when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeLogs();
});

// Initialize the logs system
function initializeLogs() {
  loadLogsData();
  setupLogsEventListeners();
}

// Load logs data
function loadLogsData() {
  renderLogsTable();
  updateLogsPagination();
}

// Setup event listeners for logs
function setupLogsEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshLogsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      loadLogsData();
      showSuccessMessage('Logs refreshed successfully!');
    });
  }

  // Export button
  const exportBtn = document.getElementById('exportLogsBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      exportLogs();
    });
  }

  // Apply filters button
  const applyFiltersBtn = document.getElementById('applyLogFilters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', function() {
      applyLogFilters();
    });
  }

  // Search input
  const searchInput = document.getElementById('logSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        applyLogFilters();
      }
    });
  }

  // Pagination buttons
  const prevPageBtn = document.getElementById('logsPrevPage');
  const nextPageBtn = document.getElementById('logsNextPage');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function() {
      if (currentLogsPage > 1) {
        currentLogsPage--;
        renderLogsTable();
        updateLogsPagination();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function() {
      const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
      if (currentLogsPage < totalPages) {
        currentLogsPage++;
        renderLogsTable();
        updateLogsPagination();
      }
    });
  }
}

// Apply filters to logs
function applyLogFilters() {
  const typeFilter = document.getElementById('logTypeFilter').value;
  const dateFilter = document.getElementById('logDateFilter').value;
  const searchTerm = document.getElementById('logSearch').value.toLowerCase();

  filteredLogs = logsData.filter(log => {
    // Filter by type
    if (typeFilter && log.action !== typeFilter) {
      return false;
    }

    // Filter by date
    if (dateFilter) {
      const logDate = log.timestamp.split(' ')[0];
      if (logDate !== dateFilter) {
        return false;
      }
    }

    // Filter by search term
    if (searchTerm) {
      const searchableText = `${log.itemName} ${log.details} ${log.user}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  currentLogsPage = 1;
  renderLogsTable();
  updateLogsPagination();
}

// Render logs table
function renderLogsTable() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  const startIndex = (currentLogsPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const pageLogs = filteredLogs.slice(startIndex, endIndex);

  tbody.innerHTML = pageLogs.map(log => createLogRow(log)).join('');
}

// Create log row HTML
function createLogRow(log) {
  const actionBadge = getActionBadge(log.action);
  const timestamp = formatTimestamp(log.timestamp);
  
  return `
    <tr>
      <td>
        <small class="text-muted">${timestamp}</small>
      </td>
      <td>
        <span class="badge ${actionBadge.class}">${actionBadge.text}</span>
      </td>
      <td>
        <span class="fw-medium">${log.itemType}</span>
      </td>
      <td>
        <span class="fw-bold">${log.itemName}</span>
      </td>
      <td>
        <small class="text-muted">${log.details}</small>
      </td>
      <td>
        <small class="text-muted">${log.user}</small>
      </td>
    </tr>
  `;
}

// Get action badge styling
function getActionBadge(action) {
  const badges = {
    'ingredient_added': { class: 'bg-success', text: 'Added' },
    'ingredient_updated': { class: 'bg-warning', text: 'Updated' },
    'ingredient_deleted': { class: 'bg-danger', text: 'Deleted' },
    'menu_added': { class: 'bg-success', text: 'Added' },
    'menu_updated': { class: 'bg-warning', text: 'Updated' },
    'menu_deleted': { class: 'bg-danger', text: 'Deleted' }
  };
  
  return badges[action] || { class: 'bg-secondary', text: 'Unknown' };
}

// Format timestamp for display
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Update logs pagination
function updateLogsPagination() {
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const pageInfo = document.getElementById('logsPageInfo');
  const prevBtn = document.getElementById('logsPrevPage');
  const nextBtn = document.getElementById('logsNextPage');

  if (pageInfo) {
    pageInfo.textContent = `Page ${currentLogsPage} of ${totalPages}`;
  }

  if (prevBtn) {
    prevBtn.disabled = currentLogsPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = currentLogsPage >= totalPages;
  }
}

// Export logs to CSV
function exportLogs() {
  const headers = ['Timestamp', 'Action', 'Item Type', 'Item Name', 'Details', 'User'];
  const csvContent = [
    headers.join(','),
    ...filteredLogs.map(log => [
      `"${log.timestamp}"`,
      `"${getActionBadge(log.action).text}"`,
      `"${log.itemType}"`,
      `"${log.itemName}"`,
      `"${log.details}"`,
      `"${log.user}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_logs_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  showSuccessMessage('Logs exported successfully!');
}

// Show success message
function showSuccessMessage(message) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      timer: 2000,
      showConfirmButton: false
    });
  } else {
    alert(message);
  }
}

// Add new log entry (called when items are added/updated/deleted)
function addLogEntry(action, itemType, itemName, details, user = 'Admin User') {
  const newLog = {
    id: logsData.length + 1,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action: action,
    itemType: itemType,
    itemName: itemName,
    details: details,
    user: user
  };

  logsData.unshift(newLog); // Add to beginning of array
  filteredLogs = [...logsData]; // Update filtered logs
  currentLogsPage = 1; // Reset to first page
  loadLogsData(); // Refresh display
}

// Make functions available globally for use by other scripts
window.addLogEntry = addLogEntry;
window.loadLogsData = loadLogsData;
