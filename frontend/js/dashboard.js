// Dashboard JavaScript functionality

// Display current date
document.addEventListener('DOMContentLoaded', function() {
  const currentDate = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('en-US', options);
});

// Role-based access control for admin pages
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!user.role || user.role !== 'admin') {
  window.location.href = 'pos.html';
}

// Add test button for notifications (for development/testing)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Test notification button
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Notification';
  testButton.className = 'btn btn-primary btn-sm position-fixed';
  testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
  testButton.onclick = function() {
    showGlobalNotification('Test notification from Dashboard!', 'success');
  };
  document.body.appendChild(testButton);
  
  // Test inventory notification button
  const testInventoryButton = document.createElement('button');
  testInventoryButton.textContent = 'Test Inventory';
  testInventoryButton.className = 'btn btn-warning btn-sm position-fixed';
  testInventoryButton.style.cssText = 'bottom: 60px; right: 20px; z-index: 9999;';
  testInventoryButton.onclick = function() {
    testInventoryNotification();
  };
  document.body.appendChild(testInventoryButton);
}

// Feedback filtering functionality
function filterFeedback(type) {
  // Remove active class from all buttons
  document.querySelectorAll('.btn-group .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to clicked button
  event.target.classList.add('active');
  
  // Here you would implement the actual filtering logic
  // For now, we'll just show a message
  console.log(`Filtering feedback by: ${type}`);
}

// Time period filtering for sales data
function changeTimePeriod(period) {
  // Remove active class from all buttons
  document.querySelectorAll('.btn-group .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to clicked button
  event.target.classList.add('active');
  
  // Update sales data based on selected period
  updateSalesData(period);
}

// Update sales data based on time period
function updateSalesData(period) {
  const salesData = getSalesDataForPeriod(period);
  
  // Calculate prediction accuracy
  const predictionAccuracy = ((1 - Math.abs(salesData.actual - salesData.predicted) / salesData.predicted) * 100);
  
  // Update summary cards
  document.getElementById('totalActualSales').textContent = `₱${salesData.actual.toLocaleString()}`;
  document.getElementById('totalPredictedSales').textContent = `₱${salesData.predicted.toLocaleString()}`;
  document.getElementById('predictionAccuracy').textContent = `${predictionAccuracy.toFixed(1)}%`;
  
  // Update comprehensive table
  updateComprehensiveSalesTable(salesData);
}

// Get sales data for specific time period
function getSalesDataForPeriod(period) {
  const data = {
    week: {
      actual: 40689,
      predicted: 37520,
      orders: 10293,
      avgOrderValue: 3.95,
      variance: 8.5,
      tableData: {
        dailyItems: [
          {
            day: 'Monday',
            headerClass: 'table-primary',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 25, actual: 3125, predicted: 2800 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 18, actual: 1260, predicted: 1400 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 8, actual: 800, predicted: 1000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 5, actual: 500, predicted: 400 },
              { name: 'Green Tea', category: 'Beverages', quantity: 15, actual: 150, predicted: 120 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 10, actual: 365, predicted: 280 }
            ]
          },
          {
            day: 'Tuesday',
            headerClass: 'table-info',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 32, actual: 4000, predicted: 3600 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 20, actual: 1400, predicted: 1200 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 12, actual: 840, predicted: 720 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 6, actual: 600, predicted: 750 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 8, actual: 400, predicted: 300 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 12, actual: 360, predicted: 330 }
            ]
          },
          {
            day: 'Wednesday',
            headerClass: 'table-warning',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 35, actual: 4375, predicted: 4200 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 22, actual: 1540, predicted: 1400 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 10, actual: 1000, predicted: 1200 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 6, actual: 600, predicted: 500 },
              { name: 'Green Tea', category: 'Beverages', quantity: 18, actual: 180, predicted: 150 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 15, actual: 450, predicted: 400 }
            ]
          },
          {
            day: 'Thursday',
            headerClass: 'table-success',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 40, actual: 5000, predicted: 4800 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 25, actual: 1750, predicted: 1500 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 15, actual: 1050, predicted: 900 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 8, actual: 800, predicted: 1000 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 10, actual: 500, predicted: 400 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 20, actual: 600, predicted: 500 }
            ]
          },
          {
            day: 'Friday',
            headerClass: 'table-danger',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 38, actual: 4750, predicted: 4320 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 20, actual: 1400, predicted: 1200 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 12, actual: 1200, predicted: 1440 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 8, actual: 800, predicted: 600 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 18, actual: 540, predicted: 480 }
            ]
          },
          {
            day: 'Saturday',
            headerClass: 'table-secondary',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 45, actual: 5625, predicted: 5400 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 30, actual: 2100, predicted: 1800 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 18, actual: 1260, predicted: 1080 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 15, actual: 1500, predicted: 1800 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 12, actual: 600, predicted: 480 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 25, actual: 750, predicted: 600 }
            ]
          },
          {
            day: 'Sunday',
            headerClass: 'table-dark',
            textClass: 'text-white',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 50, actual: 6250, predicted: 6000 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 28, actual: 1960, predicted: 1680 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 35, actual: 2450, predicted: 2100 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 22, actual: 1540, predicted: 1320 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 18, actual: 1800, predicted: 2160 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 15, actual: 1500, predicted: 1200 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 10, actual: 500, predicted: 400 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 30, actual: 900, predicted: 720 }
            ]
          }
        ]
      }
    },
    month: {
      actual: 165420,
      predicted: 152300,
      orders: 41850,
      avgOrderValue: 3.95,
      variance: 8.6,
      tableData: {
        dailyItems: [
          {
            day: 'Week 1',
            headerClass: 'table-primary',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 200, actual: 25000, predicted: 22400 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 140, actual: 9800, predicted: 11200 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 120, actual: 8400, predicted: 7200 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 80, actual: 5600, predicted: 4800 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 60, actual: 6000, predicted: 7200 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 40, actual: 4000, predicted: 5000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 30, actual: 3000, predicted: 2400 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 20, actual: 1000, predicted: 800 },
              { name: 'Green Tea', category: 'Beverages', quantity: 100, actual: 1000, predicted: 800 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 80, actual: 2400, predicted: 2000 }
            ]
          },
          {
            day: 'Week 2',
            headerClass: 'table-info',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 220, actual: 27500, predicted: 24640 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 150, actual: 10500, predicted: 12000 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 130, actual: 9100, predicted: 7800 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 90, actual: 6300, predicted: 5400 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 65, actual: 6500, predicted: 7800 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 45, actual: 4500, predicted: 5625 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 35, actual: 3500, predicted: 2800 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 25, actual: 1250, predicted: 1000 },
              { name: 'Green Tea', category: 'Beverages', quantity: 110, actual: 1100, predicted: 880 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 90, actual: 2700, predicted: 2250 }
            ]
          },
          {
            day: 'Week 3',
            headerClass: 'table-warning',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 210, actual: 26250, predicted: 25200 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 145, actual: 10150, predicted: 11600 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 125, actual: 8750, predicted: 7500 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 85, actual: 5950, predicted: 5100 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 62, actual: 6200, predicted: 7440 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 42, actual: 4200, predicted: 5250 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 32, actual: 3200, predicted: 2560 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 22, actual: 1100, predicted: 880 },
              { name: 'Green Tea', category: 'Beverages', quantity: 105, actual: 1050, predicted: 840 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 85, actual: 2550, predicted: 2125 }
            ]
          },
          {
            day: 'Week 4',
            headerClass: 'table-success',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 215, actual: 26875, predicted: 24640 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 148, actual: 10360, predicted: 11840 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 128, actual: 8960, predicted: 7680 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 88, actual: 6160, predicted: 5280 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 64, actual: 6400, predicted: 7680 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 44, actual: 4400, predicted: 5500 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 34, actual: 3400, predicted: 2720 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 24, actual: 1200, predicted: 960 },
              { name: 'Green Tea', category: 'Beverages', quantity: 108, actual: 1080, predicted: 864 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 88, actual: 2640, predicted: 2200 }
            ]
          }
        ]
      }
    },
    quarter: {
      actual: 496260,
      predicted: 456900,
      orders: 125550,
      avgOrderValue: 3.96,
      variance: 8.6,
      tableData: {
        dailyItems: [
          {
            day: 'Month 1',
            headerClass: 'table-primary',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 800, actual: 100000, predicted: 89600 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 560, actual: 39200, predicted: 44800 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 480, actual: 33600, predicted: 28800 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 320, actual: 22400, predicted: 19200 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 240, actual: 24000, predicted: 28800 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 160, actual: 16000, predicted: 20000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 120, actual: 12000, predicted: 9600 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 80, actual: 4000, predicted: 3200 },
              { name: 'Green Tea', category: 'Beverages', quantity: 400, actual: 4000, predicted: 3200 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 320, actual: 9600, predicted: 8000 }
            ]
          },
          {
            day: 'Month 2',
            headerClass: 'table-info',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 880, actual: 110000, predicted: 98560 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 600, actual: 42000, predicted: 48000 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 520, actual: 36400, predicted: 31200 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 360, actual: 25200, predicted: 21600 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 260, actual: 26000, predicted: 31200 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 180, actual: 18000, predicted: 22500 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 140, actual: 14000, predicted: 11200 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 100, actual: 5000, predicted: 4000 },
              { name: 'Green Tea', category: 'Beverages', quantity: 440, actual: 4400, predicted: 3520 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 360, actual: 10800, predicted: 9000 }
            ]
          },
          {
            day: 'Month 3',
            headerClass: 'table-warning',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 840, actual: 105000, predicted: 100800 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 580, actual: 40600, predicted: 46400 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 500, actual: 35000, predicted: 30000 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 340, actual: 23800, predicted: 20400 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 248, actual: 24800, predicted: 29760 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 168, actual: 16800, predicted: 21000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 128, actual: 12800, predicted: 10240 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 88, actual: 4400, predicted: 3520 },
              { name: 'Green Tea', category: 'Beverages', quantity: 420, actual: 4200, predicted: 3360 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 340, actual: 10200, predicted: 8500 }
            ]
          }
        ]
      }
    },
    year: {
      actual: 1985040,
      predicted: 1827600,
      orders: 502200,
      avgOrderValue: 3.96,
      variance: 8.6,
      tableData: {
        dailyItems: [
          {
            day: 'Q1',
            headerClass: 'table-primary',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 3200, actual: 400000, predicted: 358400 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 2240, actual: 156800, predicted: 179200 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 1920, actual: 134400, predicted: 115200 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 1280, actual: 89600, predicted: 76800 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 960, actual: 96000, predicted: 115200 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 640, actual: 64000, predicted: 80000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 480, actual: 48000, predicted: 38400 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 320, actual: 16000, predicted: 12800 },
              { name: 'Green Tea', category: 'Beverages', quantity: 1600, actual: 16000, predicted: 12800 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 1280, actual: 38400, predicted: 32000 }
            ]
          },
          {
            day: 'Q2',
            headerClass: 'table-info',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 3520, actual: 440000, predicted: 394240 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 2400, actual: 168000, predicted: 192000 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 2080, actual: 145600, predicted: 124800 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 1440, actual: 100800, predicted: 86400 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 1040, actual: 104000, predicted: 124800 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 720, actual: 72000, predicted: 90000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 560, actual: 56000, predicted: 44800 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 400, actual: 20000, predicted: 16000 },
              { name: 'Green Tea', category: 'Beverages', quantity: 1760, actual: 17600, predicted: 14080 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 1440, actual: 43200, predicted: 36000 }
            ]
          },
          {
            day: 'Q3',
            headerClass: 'table-warning',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 3360, actual: 420000, predicted: 403200 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 2320, actual: 162400, predicted: 185600 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 2000, actual: 140000, predicted: 120000 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 1360, actual: 95200, predicted: 81600 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 992, actual: 99200, predicted: 119040 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 672, actual: 67200, predicted: 84000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 512, actual: 51200, predicted: 40960 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 352, actual: 17600, predicted: 14080 },
              { name: 'Green Tea', category: 'Beverages', quantity: 1680, actual: 16800, predicted: 13440 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 1360, actual: 40800, predicted: 34000 }
            ]
          },
          {
            day: 'Q4',
            headerClass: 'table-success',
            items: [
              { name: 'Tonkotsu Ramen', category: 'Ramen', quantity: 3440, actual: 430000, predicted: 394240 },
              { name: 'Miso Ramen', category: 'Ramen', quantity: 2368, actual: 165760, predicted: 189440 },
              { name: 'Shoyu Ramen', category: 'Ramen', quantity: 2048, actual: 143360, predicted: 122880 },
              { name: 'Chicken Ramen', category: 'Ramen', quantity: 1408, actual: 98560, predicted: 84480 },
              { name: 'Teriyaki Bowl', category: 'Rice Bowl', quantity: 1024, actual: 102400, predicted: 122880 },
              { name: 'Chicken Teriyaki', category: 'Rice Bowl', quantity: 704, actual: 70400, predicted: 88000 },
              { name: 'Gyoza (6pcs)', category: 'Side Dishes', quantity: 544, actual: 54400, predicted: 43520 },
              { name: 'Edamame', category: 'Side Dishes', quantity: 384, actual: 19200, predicted: 15360 },
              { name: 'Green Tea', category: 'Beverages', quantity: 1728, actual: 17280, predicted: 13824 },
              { name: 'Soft Drinks', category: 'Beverages', quantity: 1408, actual: 42240, predicted: 35200 }
            ]
          }
        ]
      }
    }
  };
  
  return data[period] || data.week;
}

// Update daily sales table
function updateComprehensiveSalesTable(data) {
  const tbody = document.getElementById('dailySalesTable');
  if (!tbody) return;
  
  const tableData = data.tableData;
  
  let html = '';
  
  // Process each day's data
  tableData.dailyItems.forEach(dayData => {
    // Calculate totals for the day
    const dayTotal = dayData.items.reduce((sum, item) => sum + item.actual, 0);
    const dayPredicted = dayData.items.reduce((sum, item) => sum + item.predicted, 0);
    
    html += `
      <tr>
        <td>${dayData.day}</td>
        <td>₱${dayTotal.toLocaleString()}</td>
        <td>₱${dayPredicted.toLocaleString()}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

// Initialize food rating chart when modal is shown
document.addEventListener('DOMContentLoaded', function() {
  const feedbackModal = document.getElementById('feedbackModal');
  if (feedbackModal) {
    feedbackModal.addEventListener('shown.bs.modal', function() {
      initializeFoodRatingChart();
    });
  }

  // Initialize sales details modal
  const salesModal = document.getElementById('salesDetailsModal');
  if (salesModal) {
    salesModal.addEventListener('shown.bs.modal', function() {
      // Initialize with week data by default
      updateSalesData('week');
    });
  }
});

// Initialize food rating chart
function initializeFoodRatingChart() {
  const ctx = document.getElementById('foodRatingChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Tonkotsu Ramen', 'Miso Ramen', 'Shoyu Ramen', 'Teriyaki Bowl', 'Chicken Ramen'],
      datasets: [{
        label: 'Average Rating',
        data: [4.9, 4.7, 4.8, 4.6, 4.5],
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(255, 193, 7, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// Function to load dashboard data from API
async function loadDashboardData() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = user.token;
  
  if (!token || typeof getApiUrl !== 'function') {
    console.log('No token or API URL function available');
    return;
  }

  try {
    // Fetch sales summary data for this week
    const salesResponse = await fetch(`${getApiUrl()}/sales/sales-summary?period=week`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!salesResponse.ok) {
      throw new Error(`Sales API Error: ${salesResponse.status}`);
    }

    const salesData = await salesResponse.json();
    
    // Update Total Sales card
    const totalSalesElement = document.getElementById('totalSalesCard');
    if (totalSalesElement && salesData.sales) {
      const totalSales = salesData.sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      totalSalesElement.textContent = `₱${totalSales.toLocaleString()}`;
      totalSalesElement.className = 'fw-bold mb-2 text-success';
    }

    // Update Total Orders card
    const totalOrdersElement = document.getElementById('totalOrdersCard');
    if (totalOrdersElement) {
      totalOrdersElement.textContent = salesData.totalOrders || '0';
      totalOrdersElement.className = 'fw-bold mb-2';
    }

    // Fetch customer count data for this week
    const customerResponse = await fetch(`${getApiUrl()}/customers/count?period=week`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let customerData = null;
    if (customerResponse.ok) {
      customerData = await customerResponse.json();
      
      // Update New Customer card
      const newCustomerElement = document.getElementById('newCustomerCard');
      if (newCustomerElement) {
        newCustomerElement.textContent = customerData.totalNewCustomers || '0';
        newCustomerElement.className = 'fw-bold mb-2 text-info';
      }
    } else {
      // Show error for customer data
      const newCustomerElement = document.getElementById('newCustomerCard');
      if (newCustomerElement) {
        newCustomerElement.textContent = 'Error';
        newCustomerElement.className = 'fw-bold mb-2 text-danger';
      }
    }

    console.log('Dashboard data loaded successfully:', { salesData, customerData });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    
    // Show error messages in the cards
    const totalSalesElement = document.getElementById('totalSalesCard');
    if (totalSalesElement) {
      totalSalesElement.textContent = 'Error';
      totalSalesElement.className = 'fw-bold mb-2 text-danger';
    }

    const totalOrdersElement = document.getElementById('totalOrdersCard');
    if (totalOrdersElement) {
      totalOrdersElement.textContent = 'Error';
      totalOrdersElement.className = 'fw-bold mb-2 text-danger';
    }

    const newCustomerElement = document.getElementById('newCustomerCard');
    if (newCustomerElement) {
      newCustomerElement.textContent = 'Error';
      newCustomerElement.className = 'fw-bold mb-2 text-danger';
    }
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load dashboard data first
  loadDashboardData();
  
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarMenu = document.getElementById('sidebarMenu');
  const closeSidebar = document.getElementById('closeSidebar');

  // Initialize Bootstrap collapse
  const collapse = new bootstrap.Collapse(sidebarMenu, {
    toggle: false
  });

  // Mobile sidebar toggle
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.innerWidth < 768) {
        if (sidebarMenu.classList.contains('show')) {
          collapse.hide();
          document.body.classList.remove('sidebar-open');
        } else {
          collapse.show();
          document.body.classList.add('sidebar-open');
        }
      }
    });
  }
  
  // Close sidebar button
  if (closeSidebar) {
    closeSidebar.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      collapse.hide();
      document.body.classList.remove('sidebar-open');
    });
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', function(e) {
    if (window.innerWidth < 768 && sidebarMenu.classList.contains('show')) {
      if (!sidebarMenu.contains(e.target) && !sidebarToggle.contains(e.target)) {
        collapse.hide();
        document.body.classList.remove('sidebar-open');
      }
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 768) {
      collapse.hide();
      document.body.classList.remove('sidebar-open');
    }
  });
  
  // Close sidebar when clicking on nav links on mobile
  const navLinks = document.querySelectorAll('#sidebarMenu .nav-link');
  navLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth < 768) {
        collapse.hide();
        document.body.classList.remove('sidebar-open');
      }
    });
  });

  // Populate Low Quantity Stock list
  const lowStockList = document.getElementById('lowStockList');
  if (lowStockList && typeof getApiUrl === 'function') {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user.token;
    if (token) {
      fetch(`${getApiUrl()}/inventory/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(items => {
        const data = Array.isArray(items) ? items : (items.data || []);
        const lowItems = data.filter(i => (i.status === 'low stock' || i.calculatedStatus === 'low stock'))
                              .sort((a,b) => (a.stocks||0) - (b.stocks||0))
                              .slice(0, 5);
        if (lowItems.length === 0) {
          lowStockList.innerHTML = '<li class="list-group-item border-0 text-muted">No low stock items</li>';
          return;
        }
        lowStockList.innerHTML = lowItems.map((i, idx) => `
          <li class="list-group-item d-flex justify-content-between align-items-center ${idx < lowItems.length - 1 ? 'border-0 border-bottom' : 'border-0'}">
            <span>${i.name} <small class="text-muted">(${i.stocks} ${i.units})</small></span>
            <span class="text-danger fw-bold">Low</span>
          </li>
        `).join('');
      })
      .catch(error => {
        console.error('Error loading low stock data:', error);
        lowStockList.innerHTML = '<li class="list-group-item border-0 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Unable to load inventory data</li>';
      });
    }
  }
});
