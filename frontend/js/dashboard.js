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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
});
