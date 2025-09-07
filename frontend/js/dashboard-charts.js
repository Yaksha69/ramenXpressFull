
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
              data: [120, 180, 250, 400, 200, 300, 350],
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: 'Predicted Sales',
              data: [115, 170, 240, 390, 210, 280, 320],
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderDash: [5, 5],
              tension: 0.4,
              fill: false,
            },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            title: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  
    // Pie Chart for Order Types
    const pieCtx = document.getElementById('pieChart');
    if (pieCtx) {
      new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: ['Dine-in', 'Takeaway', 'Delivery'],
          datasets: [{
            data: [60, 30, 10],
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',   // pastel pink
              'rgba(54, 162, 235, 0.6)',   // pastel blue
              'rgba(255, 206, 86, 0.6)'    // pastel yellow
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'right' },
            title: { display: false }
          }
        }
      });
    }
  
    // Bar Chart for Product Sales
    const barCtx = document.getElementById('barChart');
    if (barCtx) {
      new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['Ramen', 'Udon', 'Soba', 'Pho', 'Laksa'],
          datasets: [{
            label: 'Product Sales',
            data: [30, 10, 14, 24, 12],
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
            ],
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
    }
  });
  