# API Migration to Production Endpoint

## Overview
The frontend has been updated to use the production API endpoint at `https://ramen-vgtz.onrender.com/api/v1` instead of the local development server.

## Changes Made

### 1. Configuration File
- Created `frontend/js/config.js` to centralize API configuration
- Easy switching between local and production endpoints

### 2. Updated JavaScript Files
All JavaScript files have been updated to use the new production endpoint:

- **mobileOrder.js**: Updated API_BASE_URL and Socket.IO URL
- **inventory.js**: Updated all inventory-related API endpoints
- **pos.js**: Updated API_BASE_URL and image upload URLs
- **login.js**: Updated authentication endpoint
- **register.js**: Updated registration endpoint
- **reports.js**: Updated sales and mobile orders endpoints

### 3. Updated HTML Files
All HTML files now include the config.js file:

- mobileOrder.html
- inventory.html
- pos.html
- reports.html
- dashboard.html
- login.html
- register.html

## API Endpoints

### Production Endpoints
- **Base URL**: `https://ramen-vgtz.onrender.com/api/v1`
- **Socket.IO**: `https://ramen-vgtz.onrender.com`
- **Uploads**: `https://ramen-vgtz.onrender.com/uploads/`

### Available Endpoints
- `GET /inventory/all` - Get all inventory items
- `POST /inventory/create` - Create new inventory item
- `PUT /inventory/update/:id` - Update inventory item
- `DELETE /inventory/delete/:id` - Delete inventory item
- `POST /menu/newMenu` - Create new menu item
- `GET /mobile-orders/all` - Get all mobile orders
- `POST /mobile-orders/add` - Create mobile order
- `GET /sales/all-sales` - Get all sales
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

## Switching Between Environments

To switch back to local development, edit `frontend/js/config.js`:

```javascript
const API_CONFIG = {
  // Comment out production and uncomment local
  // BASE_URL: 'https://ramen-vgtz.onrender.com/api/v1',
  BASE_URL: 'http://localhost:3000/api/v1',
  
  // SOCKET_URL: 'https://ramen-vgtz.onrender.com',
  SOCKET_URL: 'http://localhost:3000',
  
  // UPLOAD_BASE: 'https://ramen-vgtz.onrender.com',
  UPLOAD_BASE: 'http://localhost:3000',
};
```

## Testing
1. Open the frontend in a web browser
2. Try logging in with valid credentials
3. Test inventory management features
4. Test mobile order creation
5. Verify real-time updates work with Socket.IO

## Notes
- All authentication tokens are stored as `authToken` in localStorage
- Image uploads now point to the production server
- Socket.IO connections use the production URL for real-time updates
- The mobile app (Flutter) should also be updated to use the same endpoints 