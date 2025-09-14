# QR Payment Testing Guide

## 🧪 How to Test QR Payment in Development

### **Step 1: Start the Backend Server**
```bash
cd backend
npm start
```

### **Step 2: Open POS System**
1. Open `frontend/html/pos.html` in your browser
2. Login with your admin credentials
3. Add some items to cart

### **Step 3: Test QR Payment Flow**
1. Select **GCash** or **Maya** payment method
2. Click **CHECKOUT**
3. Click **Confirm Order**
4. QR code will appear in modal

### **Step 4: Complete Payment**
1. **Option A: Use Test Card**
   - Click the QR code (it's a link)
   - You'll be redirected to PayMongo test checkout
   - Use test card: `4242424242424242`
   - Expiry: `12/25`, CVC: `123`
   - Complete payment

2. **Option B: Use PayMongo Test Mode**
   - The QR code redirects to PayMongo's test environment
   - You can use any test payment method available

### **Step 5: Verify Payment**
- Payment should be detected automatically (every 3 seconds)
- Order will be processed after payment confirmation
- Success message will appear

## 🔍 **Debugging Tips**

### **Check Console Logs**
Open browser developer tools (F12) and watch for:
- `Payment verification result:` - Shows API response
- `Payment data:` - Shows payment status
- `Payment still pending...` - Normal while waiting
- `Payment successful!` - Payment confirmed

### **Check Backend Logs**
In your terminal, watch for:
- `🔍 Verifying payment status for: src_xxx`
- `📊 Payment status: pending/paid/failed`

### **Common Issues**
1. **QR Code Not Loading**: Check if PayMongo API keys are set
2. **Payment Not Detected**: Check network connection and API responses
3. **Order Not Processing**: Check if payment status is 'paid'

## 🚀 **Quick Test Script**

You can also test the backend directly:

```bash
# Test QR generation
node backend/test-paymongo-qr.js

# This will generate test QR codes and show the redirect URLs
```

## 📱 **Real Device Testing**

For more realistic testing:
1. Generate QR code on computer
2. Open QR code URL on your phone
3. Complete payment on mobile device
4. Check if payment is detected on computer

## 🔧 **Troubleshooting**

### **If QR Code Doesn't Generate**
- Check if `PAYMONGO_SECRET_KEY` is set in `.env`
- Check backend console for errors
- Verify API key is valid

### **If Payment Isn't Detected**
- Check if polling is running (should see logs every 3 seconds)
- Verify the source ID is correct
- Check PayMongo dashboard for payment status

### **If Order Doesn't Process**
- Check if payment status is 'paid'
- Verify the order processing logic
- Check for any JavaScript errors in console
