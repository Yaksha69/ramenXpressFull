ang port ay 3000
mongodb://localhost:27017/ramenxpressApp

# API Endpoints

## Register
POST http://localhost:3000/api/v1/auth/register
Body (JSON):
{
  "username": "adminuser",
  "password": "securepassword",
  "role": "admin" // or "cashier"
}

## Login
POST http://localhost:3000/api/v1/auth/login
Body (JSON):
{
  "username": "adminuser",
  "password": "securepassword"
}

## Inventory

### Get all inventory items
GET http://localhost:3000/api/v1/inventory
Headers:
- Authorization: Bearer <token>

### Get a single inventory item by ID
GET http://localhost:3000/api/v1/inventory/{id}
Headers:
- Authorization: Bearer <token>

### Create a new inventory item
POST http://localhost:3000/api/v1/inventory
Headers:
- Content-Type: application/json
- Authorization: Bearer <token>
Body (JSON):
{
  "name": "Tonkotsu Ramen",
  "stocks": 50,
  "units": "bowl",
  "restocked": "2024-05-01T00:00:00.000Z",
  "status": "in stock"
}

### Update an inventory item
PUT http://localhost:3000/api/v1/inventory/{id}
Headers:
- Content-Type: application/json
- Authorization: Bearer <token>
Body (JSON): (same as POST)

### Delete an inventory item
DELETE http://localhost:3000/api/v1/inventory/{id}
Headers:
- Authorization: Bearer <token>

## Sales (Admin Only)

### Create a new sale
POST http://localhost:3000/api/v1/sales/new-sale
Headers:
- Content-Type: application/json
- Authorization: Bearer <token>
Body (JSON):
{
  "menuItem": "64f1a2b3c4d5e6f7a8b9c0d1",
  "quantity": 2,
  "addOns": [
    {
      "menuItem": "64f1a2b3c4d5e6f7a8b9c0d2",
      "quantity": 1
    },
    {
      "menuItem": "64f1a2b3c4d5e6f7a8b9c0d3",
      "quantity": 1
    }
  ],
  "paymentMethod": "cash",
  "serviceType": "dine-in"
}

Response will include auto-generated orderID and date:
{
  "orderID": "0001",
  "menuItem": "64f1a2b3c4d5e6f7a8b9c0d1",
  "quantity": 2,
  "price": 250,
  "addOns": [
    {
      "menuItem": "64f1a2b3c4d5e6f7a8b9c0d2",
      "quantity": 1,
      "price": 50
    },
    {
      "menuItem": "64f1a2b3c4d5e6f7a8b9c0d3",
      "quantity": 1,
      "price": 100
    }
  ],
  "paymentMethod": "cash",
  "serviceType": "dine-in",
  "totalAmount": 650,
  "date": "2024-12-01T14:30:52.000Z"
}

### Get all sales
GET http://localhost:3000/api/v1/sales/all-sales
Headers:
- Authorization: Bearer <token>

### Get a sale by orderID
GET http://localhost:3000/api/v1/sales/order/0001
Headers:
- Authorization: Bearer <token>

### Get a sale by ID
GET http://localhost:3000/api/v1/sales/{id}
Headers:
- Authorization: Bearer <token>

### Update a sale by ID
PUT http://localhost:3000/api/v1/sales/update/{id}
Headers:
- Content-Type: application/json
- Authorization: Bearer <token>
Body (JSON): (same structure as POST)

### Delete a sale by ID
DELETE http://localhost:3000/api/v1/sales/delete/{id}
Headers:
- Authorization: Bearer <token>

## Sales Data Structure

### Order ID Format
- Auto-generated sequential identifier
- Format: `0001`, `0002`, `0003`, etc.
- Simple 4-digit number with leading zeros
- Sequential numbering based on total sales count

### Payment Methods
- `cash` - Cash payment
- `paymaya` - PayMaya digital payment
- `gcash` - GCash digital payment

### Service Types
- `takeout` - Customer takes out the order
- `dine-in` - Customer dines in the restaurant

### Add-ons (Optional)
Add-ons are menu items categorized as "add-ons":
- Each add-on references a menu item by ID
- Add-ons can have quantities (default: 1)
- Add-ons are calculated per item, not per order
- Examples: Extra noodles, extra meat, extra rice, etc.



