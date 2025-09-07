# Email OTP Verification Setup

This document explains how to set up email OTP verification for your mobile app.

## Features

- ✅ Email OTP verification for customer registration
- ✅ Email OTP verification for customer login
- ✅ 6-digit OTP codes with 10-minute expiration
- ✅ Rate limiting (max 3 attempts per OTP)
- ✅ Beautiful HTML email templates
- ✅ Automatic cleanup of expired OTPs

## Setup Instructions

### 1. Environment Variables

Add these variables to your `.env` file:

```env
# Gmail Configuration for Email OTP
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

### 2. Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Google account
2. Go to **Google Account settings** > **Security** > **2-Step Verification** > **App passwords**
3. Generate a new app password for "Mail"
4. Use that 16-character password (not your regular Gmail password)

### 3. API Endpoints

#### Send Registration OTP
```http
POST /api/v1/otp/send-registration-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Send Login OTP
```http
POST /api/v1/otp/send-login-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify OTP
```http
POST /api/v1/otp/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "registration"
}
```

#### Resend OTP
```http
POST /api/v1/otp/resend-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "purpose": "registration"
}
```

### 4. Updated Registration Flow

The customer registration now requires email OTP verification:

```http
POST /api/v1/customers/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "emailOTP": "123456"
}
```

### 5. Mobile App Integration

1. **Step 1**: User enters email and requests OTP
   ```javascript
   // Send OTP request
   const response = await fetch('/api/v1/otp/send-registration-otp', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: userEmail })
   });
   ```

2. **Step 2**: User enters OTP code
   ```javascript
   // Verify OTP
   const response = await fetch('/api/v1/otp/verify-otp', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       email: userEmail, 
       code: otpCode, 
       purpose: 'registration' 
     })
   });
   ```

3. **Step 3**: Complete registration with verified OTP
   ```javascript
   // Register with verified OTP
   const response = await fetch('/api/v1/customers/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       firstName, 
       lastName, 
       email, 
       password, 
       emailOTP: otpCode 
     })
   });
   ```

## Security Features

- **Rate Limiting**: Maximum 3 attempts per OTP
- **Expiration**: OTPs expire after 10 minutes
- **One-time Use**: Each OTP can only be used once
- **Automatic Cleanup**: Expired OTPs are automatically deleted
- **Email Validation**: Prevents duplicate registrations

## Error Handling

The API returns appropriate error messages for:
- Invalid email format
- Email already registered
- Invalid or expired OTP
- Rate limit exceeded
- Server errors

## Testing

You can test the email OTP system using tools like Postman or curl:

```bash
# Send registration OTP
curl -X POST http://localhost:3000/api/v1/otp/send-registration-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Verify OTP
curl -X POST http://localhost:3000/api/v1/otp/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456", "purpose": "registration"}'
```

## Next Steps

Once email OTP is working, you can add phone number OTP verification using services like:
- Twilio SMS
- AWS SNS
- Firebase Auth
- Custom SMS gateway
