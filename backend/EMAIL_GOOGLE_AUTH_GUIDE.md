# Email Registration and Google Sign-In Guide

This guide explains how to implement and use the new email registration and Google sign-in features for the mobile app.

## Features Added

### 1. Email Registration
- Customers can register using email and password
- Email verification required before login
- Password strength validation
- Email verification token system

### 2. Google Sign-In
- Customers can sign in using Google OAuth
- Automatic account creation for new Google users
- Seamless integration with existing customer system

### 3. Multi-Authentication Support
- Support for phone, email, and Google authentication
- Unified customer profile system
- Flexible authentication methods

## API Endpoints

### Email Authentication

#### Register with Email
```
POST /api/customers/register-email
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer registered successfully. Please check your email to verify your account.",
  "data": {
    "customer": {
      "id": "customer_id",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "authMethod": "email",
      "isEmailVerified": false
    },
    "verificationEmailSent": true
  }
}
```

#### Login with Email
```
POST /api/customers/login-email
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

#### Verify Email
```
POST /api/customers/verify-email
Content-Type: application/json

{
  "token": "verification_token_from_email"
}
```

#### Resend Email Verification
```
POST /api/customers/resend-email-verification
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

### Google Authentication

#### Google Sign-In
```
POST /api/customers/google-signin
Content-Type: application/json

{
  "googleToken": "google_id_token_from_client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google sign-in successful",
  "data": {
    "customer": {
      "id": "customer_id",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@gmail.com",
      "authMethod": "google",
      "isEmailVerified": true,
      "isPhoneVerified": true
    },
    "token": "jwt_token"
  }
}
```

## Environment Variables

Add these to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here

# Frontend URL (for email verification links)
FRONTEND_URL=http://localhost:3000
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install google-auth-library crypto
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your app's package name and SHA-1 fingerprint
6. Copy the Client ID to your `.env` file

### 3. Email Setup

1. Use Gmail SMTP or your preferred email service
2. For Gmail, enable 2-factor authentication and create an App Password
3. Add email credentials to your `.env` file

### 4. Database Migration

The customer model has been updated to support multiple authentication methods. Existing customers will continue to work with phone authentication.

## Mobile App Integration

### Email Registration Flow

1. User enters email, password, first name, last name
2. App calls `/api/customers/register-email`
3. User receives verification email
4. User clicks verification link or enters token
5. App calls `/api/customers/verify-email`
6. User can now login with `/api/customers/login-email`

### Google Sign-In Flow

1. User taps "Sign in with Google"
2. Google OAuth flow completes on client
3. App receives Google ID token
4. App calls `/api/customers/google-signin` with token
5. Server verifies token and creates/updates customer
6. App receives JWT token for authenticated requests

### Client-Side Implementation

#### React Native Example

```javascript
// Google Sign-In
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo;
    
    const response = await fetch('/api/customers/google-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleToken: idToken })
    });
    
    const data = await response.json();
    if (data.success) {
      // Store JWT token and navigate to main app
      await AsyncStorage.setItem('token', data.data.token);
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
  }
};

// Email Registration
const registerWithEmail = async (userData) => {
  const response = await fetch('/api/customers/register-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  return data;
};
```

## Security Considerations

1. **Password Requirements**: Minimum 6 characters with at least one letter and one number
2. **Email Verification**: Required before login for email-based accounts
3. **Token Expiration**: JWT tokens expire in 7 days
4. **Rate Limiting**: Email verification resend limited to once per minute
5. **Google Token Verification**: Server-side verification of Google ID tokens

## Error Handling

Common error responses:

```json
{
  "success": false,
  "message": "Customer with this email already exists"
}

{
  "success": false,
  "message": "Please verify your email before logging in",
  "requiresEmailVerification": true,
  "email": "user@example.com"
}

{
  "success": false,
  "message": "Invalid Google token"
}
```

## Testing

### Test Email Registration
1. Register with a valid email
2. Check email for verification link
3. Verify email using token
4. Login with email and password

### Test Google Sign-In
1. Use Google OAuth flow to get ID token
2. Send token to `/api/customers/google-signin`
3. Verify customer creation and JWT token response

## Migration Notes

- Existing phone-based customers continue to work unchanged
- New customers can choose between phone, email, or Google authentication
- Customer profiles support multiple authentication methods
- All existing API endpoints remain functional
