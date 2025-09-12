# Mobile Order - Sales Integration

## Overview

This document explains how mobile orders are now integrated with the sales system to ensure all orders are properly tracked in both systems.

## How It Works

### Automatic Integration
When a mobile order is created, the system automatically:
1. Creates the mobile order record (as before)
2. Creates corresponding sales records for each item in the order
3. Links the sales records to the mobile order for tracking

### Key Features

#### Mobile Order Creation
- **Endpoint**: `POST /api/v1/mobile-orders/add`
- **Authentication**: Customer token required
- **Side Effect**: Automatically creates sales records

#### Sales Record Creation
Each item in a mobile order creates a separate sales record with:
- Sequential order ID (0001, 0002, etc.)
- Menu item reference
- Quantity and pricing
- Add-ons (if any)
- Payment method mapping
- Mobile order reference fields

### Data Mapping

#### Payment Methods
| Mobile Order | Sales Record |
|--------------|--------------|
| `Cash` | `cash` |
| `PayMaya` | `paymaya` |
| `GCash` | `gcash` |

#### Service Types
| Mobile Order | Sales Record |
|--------------|--------------|
| `Pickup` | `takeout` |
| `Delivery` | `takeout` (delivery orders are treated as takeout for sales) |

### Database Schema Updates

#### Sales Model New Fields
```javascript
{
  // ... existing fields ...
  mobileOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MobileOrder',
    required: false
  },
  mobileOrderReference: {
    type: String,
    required: false
  },
  isFromMobileOrder: {
    type: Boolean,
    default: false
  }
}
```

### Manual Sync (For Existing Orders)

If you have existing mobile orders that weren't automatically synced, you can manually sync them:

#### Endpoint
```
POST /api/v1/mobile-orders/sync-to-sales
Authorization: Bearer <admin_token>
```

#### Response
```json
{
  "message": "Mobile orders sync completed",
  "syncedCount": 15,
  "errorCount": 0,
  "totalProcessed": 15
}
```

### Benefits

1. **Unified Reporting**: All orders appear in sales reports
2. **Inventory Management**: Sales records trigger inventory deduction
3. **Financial Tracking**: Complete revenue tracking across all order types
4. **Data Consistency**: No missing orders in financial reports
5. **Audit Trail**: Clear linkage between mobile orders and sales records

### Error Handling

- If sales record creation fails, the mobile order is still created
- Errors are logged but don't prevent mobile order completion
- Manual sync can be run to catch any missed integrations

### Monitoring

Check the server logs for:
- `💰 Created sales record for mobile order item: [orderID]`
- `⚠️ Warning: Failed to create sales record: [error]`
- `🔄 Starting mobile orders to sales sync...`

### API Endpoints

#### Mobile Orders
- `POST /mobile-orders/add` - Create mobile order (auto-creates sales)
- `GET /mobile-orders/all` - Get all mobile orders
- `GET /mobile-orders/my-orders` - Get customer's orders
- `PATCH /mobile-orders/:orderId/status` - Update order status

#### Sales Integration
- `POST /mobile-orders/sync-to-sales` - Manual sync (admin only)
- `GET /sales/all-sales` - Get all sales (includes mobile orders)

### Example Flow

1. Customer places mobile order with 2 items
2. Mobile order created with ID "1234"
3. 2 sales records created with IDs "0001" and "0002"
4. Both sales records reference mobile order "1234"
5. Sales records trigger inventory deduction
6. All orders appear in sales reports

This integration ensures complete order tracking and financial reporting across all order channels. 