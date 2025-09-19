# SMS OTP Setup Guide

This guide will help you set up SMS OTP functionality using the IPROG SMS API.

## Environment Variables

Add the following environment variable to your `.env` file:

```env
# SMS Configuration (for SMS OTP)
SMS_API_TOKEN=your_iprog_sms_api_token_here
```

## Getting Your SMS API Token

1. Visit [IPROG SMS API](https://sms.iprogtech.com/api/v1/documentation)
2. Register for an account
3. Get your API token from the dashboard
4. Add the token to your `.env` file

## API Endpoints

### Send Phone OTP (Registration)
- **POST** `/api/v1/otp/send-phone-otp`
- **Body:**
  ```json
  {
    "phoneNumber": "091712345678",
    "customMessage": "Your verification code is :otp" // Optional
  }
  ```

### Verify Phone OTP (Registration)
- **POST** `/api/v1/otp/verify-phone-otp`
- **Body:**
  ```json
  {
    "phoneNumber": "091712345678",
    "otpCode": "123456"
  }
  ```

### Send Phone OTP (Login)
- **POST** `/api/v1/otp/send-login-phone-otp`
- **Body:**
  ```json
  {
    "phoneNumber": "091712345678",
    "customMessage": "Your login code is :otp" // Optional
  }
  ```

### Verify Phone OTP (Login)
- **POST** `/api/v1/otp/verify-login-phone-otp`
- **Body:**
  ```json
  {
    "phoneNumber": "091712345678",
    "otpCode": "123456"
  }
  ```

### Check SMS Credits
- **GET** `/api/v1/otp/sms-credits`

### Get OTP List (Debug)
- **GET** `/api/v1/otp/phone-otp-list/:phoneNumber`

## Phone Number Format

The system automatically formats Philippine mobile numbers:
- Input: `091712345678` or `91712345678`
- Formatted: `6391712345678`

## Features

- ✅ Automatic phone number formatting for Philippine numbers
- ✅ Phone number validation
- ✅ OTP expiration handling (5 minutes by default)
- ✅ Duplicate phone number prevention
- ✅ Custom message support
- ✅ Credit balance checking
- ✅ Error handling and logging

## Usage Examples

### Frontend Integration

```javascript
// Send OTP
const sendOTP = async (phoneNumber) => {
  const response = await fetch('/api/v1/otp/send-phone-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: phoneNumber
    })
  });
  
  return await response.json();
};

// Verify OTP
const verifyOTP = async (phoneNumber, otpCode) => {
  const response = await fetch('/api/v1/otp/verify-phone-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      otpCode: otpCode
    })
  });
  
  return await response.json();
};
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error scenarios:
- Invalid phone number format
- Phone number already registered
- Invalid OTP code
- SMS service unavailable
- Insufficient credits

## Testing

You can test the SMS functionality using the provided endpoints. Make sure to:

1. Set up your SMS API token
2. Use a valid Philippine mobile number
3. Check your SMS credits before testing
4. Monitor the server logs for any errors

## Support

For issues with the SMS service, check:
1. Server logs for error details
2. SMS API credits balance
3. Phone number format
4. Network connectivity

For IPROG SMS API issues, refer to their [documentation](https://sms.iprogtech.com/api/v1/documentation).
