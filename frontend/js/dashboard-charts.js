
document.addEventListener('DOMContentLoaded', function () {
    // Sales Line Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
      new Chart(salesCtx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Actual Sales',
              data: [5200, 6800, 7500, 8200, 7800, 9500, 10800],
              borderColor: 'rgba(40, 167, 69, 1)',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: 'rgba(40, 167, 69, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 5
            },
            {
              label: 'Predicted Sales',
              data: [4800, 6200, 7000, 7800, 7200, 8800, 10200],
              borderColor: 'rgba(13, 202, 240, 1)',
              backgroundColor: 'rgba(13, 202, 240, 0.1)',
              borderDash: [5, 5],
              tension: 0.4,
              fill: false,
              pointBackgroundColor: 'rgba(13, 202, 240, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 5
            },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true, 
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15
              }
            },
            title: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ₱${value.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              grid: {
                color: 'rgba(0,0,0,0.1)'
              },
              ticks: {
                callback: function(value) {
                  return '₱' + value.toLocaleString();
                }
              }
            },
            x: {
              grid: {
                color: 'rgba(0,0,0,0.1)'
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
  
    // Pie Chart for Order Types (dynamic from backend sales)
    const pieCtx = document.getElementById('pieChart');
    if (pieCtx) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.token;

      const buildPie = (counts) => {
        const total = (counts.dineIn || 0) + (counts.pickup || 0) + (counts.delivery || 0);
        const pct = total > 0 ? [
          Math.round(((counts.dineIn || 0) / total) * 100),
          Math.round(((counts.pickup || 0) / total) * 100),
          Math.round(((counts.delivery || 0) / total) * 100)
        ] : [0, 0, 0];

        const labelsWithPct = ['Dine-in', 'Pick Up', 'Delivery'].map((l, i) => `${l} (${pct[i]}%)`);

        return new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: labelsWithPct,
          datasets: [{
            data: pct,
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)'
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true, 
              position: 'right',
              labels: {
                boxWidth: 18,
                boxHeight: 10,
                padding: 14,
                font: { size: 11 }
              }
            },
            title: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw ?? 0;
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        }
        }
      );
      };

      if (!token || typeof getApiUrl !== 'function') {
        console.error('No authentication token or API URL function available');
        return;
      }

      fetch(`${getApiUrl()}/sales/sales-summary?period=week`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`API Error: ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (!data.sales || !Array.isArray(data.sales)) {
          throw new Error('Invalid data format received from API');
        }
        const counts = { dineIn: 0, pickup: 0, delivery: 0 };
        data.sales.forEach(s => {
          const t = (s.serviceType || '').toLowerCase();
          if (t === 'dine-in') counts.dineIn++;
          else if (t === 'pickup' || t === 'takeout') counts.pickup++;
        });
        buildPie(counts);
      })
      .catch(error => {
        console.error('Error loading order type data:', error);
        // Show error message in the chart area
        if (pieCtx) {
          pieCtx.parentElement.innerHTML = '<div class="text-center text-muted p-3"><i class="fas fa-exclamation-triangle me-2"></i>Unable to load order data</div>';
        }
      });
    }
  
    // Bar Chart for Product Sales (dynamic)
    const barCtx = document.getElementById('barChart');
    if (barCtx) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.token;

      const buildChart = (labels, data) => new Chart(barCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Product Sales (qty)',
            data,
            backgroundColor: labels.map((_, i) => [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(255, 159, 64, 0.5)'
            ][i % 6]),
            borderColor: labels.map((_, i) => [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ][i % 6]),
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false }
          },
          scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 10 } }, beginAtZero: true },
          },
        },
      });

      if (!token || typeof getApiUrl !== 'function') {
        console.error('No authentication token or API URL function available');
        return;
      }

      fetch(`${getApiUrl()}/sales/product-sales?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`API Error: ${res.status} - ${res.statusText}`);
        }
        return res.json();
      })
      .then(items => {
        if (!Array.isArray(items)) {
          throw new Error('Invalid data format received from API');
        }
        if (items.length === 0) {
          throw new Error('No product sales data available');
        }
        const labels = items.map(i => i.name || 'Unknown');
        const data = items.map(i => Number(i.totalQuantity) || 0);
        buildChart(labels, data);
      })
      .catch(error => {
        console.error('Error loading product sales data:', error);
        // Show error message in the chart area
        if (barCtx) {
          barCtx.parentElement.innerHTML = '<div class="text-center text-muted p-3"><i class="fas fa-exclamation-triangle me-2"></i>Unable to load product sales data</div>';
        }
      });
    }
  });
  