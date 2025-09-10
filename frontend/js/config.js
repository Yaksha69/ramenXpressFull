// API Configuration
const API_CONFIG = {
  // Development mode - set to true to use local backend
  DEV_MODE: true,
  
  // Production API (your backend)
  BASE_URL: 'https://ramen-27je.onrender.com/api/v1',
  
  // Local API (for development)
  LOCAL_BASE_URL: 'http://localhost:3000/api/v1',
  
  // Socket.IO URL (for real-time updates)
  SOCKET_URL: 'https://ramen-27je.onrender.com',
  LOCAL_SOCKET_URL: 'http://localhost:3000',
  
  // Upload URLs
  UPLOAD_BASE: 'https://ramen-27je.onrender.com',
  LOCAL_UPLOAD_BASE: 'http://localhost:3000',
  
  // Main application URL
  MAIN_APP_URL: 'https://ramen-27je.onrender.com'
};

// Helper function to get the correct URL based on dev mode
function getApiUrl() {
  return API_CONFIG.DEV_MODE ? API_CONFIG.LOCAL_BASE_URL : API_CONFIG.BASE_URL;
}

function getSocketUrl() {
  return API_CONFIG.DEV_MODE ? API_CONFIG.LOCAL_SOCKET_URL : API_CONFIG.SOCKET_URL;
}

function getUploadUrl() {
  return API_CONFIG.DEV_MODE ? API_CONFIG.LOCAL_UPLOAD_BASE : API_CONFIG.UPLOAD_BASE;
}

function getMainAppUrl() {
  return API_CONFIG.MAIN_APP_URL;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, getApiUrl, getSocketUrl, getUploadUrl, getMainAppUrl };
} 