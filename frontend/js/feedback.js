// Customer Feedback System JavaScript

// Sample feedback data (in a real app, this would come from an API)
let feedbackData = [
  {
    id: 1,
    customerName: "John Doe",
    orderNumber: "1234",
    rating: 5,
    foodRating: 5,
    category: "food_quality",
    comment: "Amazing ramen! The broth was rich and flavorful. Will definitely come back!",
    date: "2024-01-15",
    isAnonymous: false,
    foodItems: [
      { name: "Tonkotsu Ramen", rating: 5 },
      { name: "Gyoza", rating: 4 },
      { name: "Coca Cola", rating: 5 }
    ]
  },
  {
    id: 2,
    customerName: "Sarah Wilson",
    orderNumber: "1235",
    rating: 4,
    foodRating: 4,
    category: "service",
    comment: "Great service and fast delivery. The staff was very friendly and helpful.",
    date: "2024-01-14",
    isAnonymous: false,
    foodItems: [
      { name: "Miso Ramen", rating: 4 },
      { name: "Chicken Karaage", rating: 5 },
      { name: "Green Tea", rating: 4 }
    ]
  },
  {
    id: 3,
    customerName: "Anonymous",
    orderNumber: "1236",
    rating: 3,
    foodRating: 4,
    category: "value_for_money",
    comment: "Good food but a bit pricey for the portion size.",
    date: "2024-01-13",
    isAnonymous: true,
    foodItems: [
      { name: "Shoyu Ramen", rating: 4 },
      { name: "Edamame", rating: 3 },
      { name: "Coca Cola", rating: 4 }
    ]
  },
  {
    id: 4,
    customerName: "Mike Chen",
    orderNumber: "1237",
    rating: 5,
    foodRating: 5,
    category: "ambiance",
    comment: "Love the atmosphere! Perfect place for a date night.",
    date: "2024-01-12",
    isAnonymous: false,
    foodItems: [
      { name: "Spicy Tonkotsu Ramen", rating: 5 },
      { name: "Takoyaki", rating: 5 },
      { name: "Sake", rating: 4 }
    ]
  },
  {
    id: 5,
    customerName: "Lisa Park",
    orderNumber: "1238",
    rating: 2,
    foodRating: 3,
    category: "speed",
    comment: "Food took too long to arrive. Quality was good but the wait was frustrating.",
    date: "2024-01-11",
    isAnonymous: false,
    foodItems: [
      { name: "Vegetable Ramen", rating: 3 },
      { name: "Spring Rolls", rating: 2 },
      { name: "Green Tea", rating: 4 }
    ]
  },
  {
    id: 6,
    customerName: "David Kim",
    orderNumber: "1239",
    rating: 4,
    foodRating: 5,
    category: "food_quality",
    comment: "Excellent ramen with authentic flavors. The chashu was perfectly cooked.",
    date: "2024-01-10",
    isAnonymous: false,
    foodItems: [
      { name: "Tonkotsu Ramen", rating: 5 },
      { name: "Chashu Bowl", rating: 5 },
      { name: "Coca Cola", rating: 4 }
    ]
  }
];

// Initialize feedback system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeFeedbackSystem();
});

// Initialize the feedback system
function initializeFeedbackSystem() {
  loadQuickSummary();
  loadRecentFeedbackPreview();
  
  // Initialize modal content when modal is shown
  const feedbackManagementModal = document.getElementById('feedbackManagementModal');
  if (feedbackManagementModal) {
    feedbackManagementModal.addEventListener('show.bs.modal', function() {
      loadModalFeedbackData();
      createModalFeedbackChart();
    });
  }
}

// Note: Star rating functionality removed as admins can only view feedback, not add it

// Load quick summary for dashboard
function loadQuickSummary() {
  const totalFeedback = feedbackData.length;
  const averageRating = feedbackData.reduce((sum, feedback) => sum + feedback.rating, 0) / totalFeedback;
  const positiveFeedback = feedbackData.filter(feedback => feedback.rating >= 4).length;
  const positivePercentage = Math.round((positiveFeedback / totalFeedback) * 100);
  
  // Update quick summary cards
  document.getElementById('quickAverageRating').textContent = averageRating.toFixed(1);
  document.getElementById('quickTotalFeedback').textContent = totalFeedback;
  document.getElementById('quickPositiveFeedback').textContent = `${positivePercentage}%`;
  document.getElementById('quickResponseRate').textContent = '95%'; // Mock data
}

// Load recent feedback preview for dashboard
function loadRecentFeedbackPreview() {
  const recentFeedbackPreview = document.getElementById('recentFeedbackPreview');
  if (!recentFeedbackPreview) return;
  
  // Get last 2 feedback items
  const recentItems = feedbackData
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 2);
  
  recentFeedbackPreview.innerHTML = recentItems.map(feedback => createRecentFeedbackPreviewItem(feedback)).join('');
}

// Create recent feedback preview item
function createRecentFeedbackPreviewItem(feedback) {
  const stars = generateStars(feedback.rating);
  const displayName = feedback.isAnonymous ? 'Anonymous' : feedback.customerName;
  const formattedDate = formatDate(feedback.date);
  
  return `
    <div class="card mb-2 shadow-sm">
      <div class="card-body p-2">
        <div class="d-flex align-items-center gap-2">
          <div class="flex-shrink-0">
            <div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
              <i class="fas fa-user text-primary small"></i>
            </div>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0 small">${displayName}</h6>
              <small class="text-muted">${formattedDate}</small>
            </div>
            <div class="feedback-rating mb-1 small">${stars}</div>
            <p class="card-text text-muted small mb-0">${feedback.comment.substring(0, 50)}${feedback.comment.length > 50 ? '...' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load modal feedback data
function loadModalFeedbackData() {
  loadModalFeedbackList();
  updateModalFeedbackSummary();
}

// Load feedback list for modal
function loadModalFeedbackList() {
  const feedbackList = document.getElementById('modalFeedbackList');
  if (!feedbackList) return;
  
  // Sort feedback by date (newest first)
  const sortedFeedback = feedbackData.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  feedbackList.innerHTML = sortedFeedback.map(feedback => createFeedbackItem(feedback)).join('');
}

// Update modal feedback summary
function updateModalFeedbackSummary() {
  const totalFeedback = feedbackData.length;
  const averageRating = feedbackData.reduce((sum, feedback) => sum + feedback.rating, 0) / totalFeedback;
  const positiveFeedback = feedbackData.filter(feedback => feedback.rating >= 4).length;
  const positivePercentage = Math.round((positiveFeedback / totalFeedback) * 100);
  
  // Update modal summary cards
  document.getElementById('modalAverageRating').textContent = averageRating.toFixed(1);
  document.getElementById('modalTotalFeedback').textContent = totalFeedback;
  document.getElementById('modalPositiveFeedback').textContent = `${positivePercentage}%`;
  document.getElementById('modalResponseRate').textContent = '95%'; // Mock data
}

// Load feedback data and display it (legacy function for compatibility)
function loadFeedbackData() {
  loadModalFeedbackData();
}

// Create feedback item HTML (admin view-only)
function createFeedbackItem(feedback) {
  const stars = generateStars(feedback.rating);
  const foodStars = generateStars(feedback.foodRating);
  const categoryName = getCategoryName(feedback.category);
  const displayName = feedback.isAnonymous ? 'Anonymous' : feedback.customerName;
  const formattedDate = formatDate(feedback.date);
  const orderInfo = feedback.orderNumber ? `Order #${feedback.orderNumber}` : 'No order number';
  
  return `
    <div class="card mb-2 shadow-sm">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h6 class="card-title mb-0">${displayName}</h6>
          <div class="feedback-rating">${stars}</div>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge bg-secondary">${categoryName}</span>
          <small class="text-muted">${orderInfo}</small>
        </div>
        <div class="mb-2">
          <small class="text-muted">Overall: ${stars}</small>
          <br>
          <small class="text-muted">Food: ${foodStars}</small>
        </div>
        <p class="card-text small mb-2">${feedback.comment}</p>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">${formattedDate}</small>
          <span class="badge bg-${feedback.rating >= 4 ? 'success' : feedback.rating >= 3 ? 'warning' : 'danger'}">
            ${feedback.rating >= 4 ? 'Positive' : feedback.rating >= 3 ? 'Neutral' : 'Negative'}
          </span>
        </div>
      </div>
    </div>
  `;
}

// Generate star HTML
function generateStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<i class="fas fa-star star"></i>';
    } else {
      stars += '<i class="fas fa-star star empty"></i>';
    }
  }
  return stars;
}

// Get category display name
function getCategoryName(category) {
  const categories = {
    'food_quality': 'Food Quality',
    'service': 'Service',
    'ambiance': 'Ambiance',
    'value_for_money': 'Value for Money',
    'speed': 'Speed of Service',
    'other': 'Other'
  };
  return categories[category] || 'Other';
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Note: Recent feedback sidebar functions removed as they're not needed in admin view-only mode

// Create modal feedback chart
function createModalFeedbackChart() {
  const ctx = document.getElementById('modalFeedbackChart');
  if (!ctx) return;
  
  // Count ratings
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbackData.forEach(feedback => {
    ratingCounts[feedback.rating]++;
  });
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
      datasets: [{
        label: 'Number of Reviews',
        data: [ratingCounts[5], ratingCounts[4], ratingCounts[3], ratingCounts[2], ratingCounts[1]],
        backgroundColor: [
          '#28a745',
          '#20c997',
          '#ffc107',
          '#fd7e14',
          '#dc3545'
        ],
        borderColor: [
          '#1e7e34',
          '#1aa179',
          '#e0a800',
          '#e55a00',
          '#c82333'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Note: Submit feedback function removed as admins can only view feedback, not add it

// Refresh feedback data (admin view-only)
function refreshFeedback() {
  loadQuickSummary();
  loadRecentFeedbackPreview();
  loadModalFeedbackData();
  createModalFeedbackChart();
}

// Export feedback data
function exportFeedback() {
  // Create CSV content
  const headers = ['ID', 'Customer Name', 'Order Number', 'Overall Rating', 'Food Rating', 'Category', 'Comment', 'Date', 'Anonymous'];
  const csvContent = [
    headers.join(','),
    ...feedbackData.map(feedback => [
      feedback.id,
      `"${feedback.customerName}"`,
      feedback.orderNumber || '',
      feedback.rating,
      feedback.foodRating,
      feedback.category,
      `"${feedback.comment.replace(/"/g, '""')}"`,
      feedback.date,
      feedback.isAnonymous ? 'Yes' : 'No'
    ].join(','))
  ].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customer_feedback_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  alert('Feedback data exported successfully!');
}

// Filter feedback based on search and filter criteria
function filterFeedback() {
  const ratingFilter = document.getElementById('ratingFilter').value;
  const foodRatingFilter = document.getElementById('foodRatingFilter').value;
  const categoryFilter = document.getElementById('categoryFilter').value;
  const searchTerm = document.getElementById('searchFeedback').value.toLowerCase();
  
  let filteredData = feedbackData;
  
  // Filter by overall rating
  if (ratingFilter) {
    filteredData = filteredData.filter(feedback => feedback.rating == ratingFilter);
  }
  
  // Filter by food rating
  if (foodRatingFilter) {
    filteredData = filteredData.filter(feedback => feedback.foodRating == foodRatingFilter);
  }
  
  // Filter by category
  if (categoryFilter) {
    filteredData = filteredData.filter(feedback => feedback.category === categoryFilter);
  }
  
  // Filter by search term
  if (searchTerm) {
    filteredData = filteredData.filter(feedback => 
      feedback.customerName.toLowerCase().includes(searchTerm) ||
      feedback.comment.toLowerCase().includes(searchTerm) ||
      (feedback.orderNumber && feedback.orderNumber.includes(searchTerm))
    );
  }
  
  // Update the display
  const feedbackList = document.getElementById('modalFeedbackList');
  if (feedbackList) {
    feedbackList.innerHTML = filteredData.map(feedback => createFeedbackItem(feedback)).join('');
  }
}
