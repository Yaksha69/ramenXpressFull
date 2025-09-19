import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class OTPService {
  // Dynamic base URL based on build configuration
  static String get baseUrl {
    // Check if we're in debug mode (development)
    const bool isDebug = bool.fromEnvironment('dart.vm.product') == false;
    
    if (isDebug) {
      // Development mode
      return 'http://192.168.0.106:3000';
    } else {
      // Production mode
      return 'https://ramenb.onrender.com';
    }
  }

  // Send SMS OTP for phone verification during registration
  static Future<Map<String, dynamic>> sendPhoneOTP(String phoneNumber, {String? customMessage}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/otp/send-phone-otp'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          if (customMessage != null) 'customMessage': customMessage,
        }),
      );

      final data = jsonDecode(response.body);
      
      return {
        'success': response.statusCode == 200,
        'message': data['message'] ?? 'Unknown error',
        'data': data['data'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
        'data': null,
      };
    }
  }

  // Verify SMS OTP for phone verification
  static Future<Map<String, dynamic>> verifyPhoneOTP(String phoneNumber, String otpCode) async {
    try {
      // Get auth token for authenticated requests
      final prefs = await SharedPreferences.getInstance();
      final authToken = prefs.getString('auth_token');
      
      final headers = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists (for profile updates)
      if (authToken != null) {
        headers['Authorization'] = 'Bearer $authToken';
      }
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/otp/verify-phone-otp'),
        headers: headers,
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          'otpCode': otpCode,
        }),
      );

      final data = jsonDecode(response.body);
      
      return {
        'success': response.statusCode == 200,
        'message': data['message'] ?? 'Unknown error',
        'data': data['data'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
        'data': null,
      };
    }
  }

  // Send SMS OTP for login (existing customers)
  static Future<Map<String, dynamic>> sendLoginPhoneOTP(String phoneNumber, {String? customMessage}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/otp/send-login-phone-otp'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          if (customMessage != null) 'customMessage': customMessage,
        }),
      );

      final data = jsonDecode(response.body);
      
      return {
        'success': response.statusCode == 200,
        'message': data['message'] ?? 'Unknown error',
        'data': data['data'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
        'data': null,
      };
    }
  }

  // Verify SMS OTP for login
  static Future<Map<String, dynamic>> verifyLoginPhoneOTP(String phoneNumber, String otpCode) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/otp/verify-login-phone-otp'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          'otpCode': otpCode,
        }),
      );

      final data = jsonDecode(response.body);
      
      return {
        'success': response.statusCode == 200,
        'message': data['message'] ?? 'Unknown error',
        'data': data['data'],
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
        'data': null,
      };
    }
  }

  // Format phone number to Philippine format
  static String formatPhoneNumber(String phoneNumber) {
    // Remove all non-digit characters
    String digits = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    
    // Handle different formats
    if (digits.startsWith('63')) {
      return '+$digits';
    } else if (digits.startsWith('0')) {
      return '+63${digits.substring(1)}';
    } else if (digits.length == 10) {
      return '+63$digits';
    } else {
      return '+63$digits';
    }
  }

  // Validate Philippine phone number format
  static bool isValidPhoneNumber(String phoneNumber) {
    String digits = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    
    // Check if it's a valid Philippine mobile number
    if (digits.startsWith('63')) {
      digits = digits.substring(2);
    } else if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    // Philippine mobile numbers start with 9 and have 10 digits total
    return digits.length == 10 && digits.startsWith('9');
  }
}
