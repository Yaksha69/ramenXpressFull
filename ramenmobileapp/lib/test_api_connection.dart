import 'package:dio/dio.dart';

class ApiConnectionTest {
  static const String baseUrl = 'https://ramenb.onrender.com/api/v1';
  
  static Future<void> testConnection() async {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
    ));

    try {
      print('Testing API connection...');
      
      // Test health endpoint
      final healthResponse = await dio.get('/health');
      print('✅ Health check: ${healthResponse.statusCode}');
      
      // Test menu endpoint
      final menuResponse = await dio.get('/menu/all');
      print('✅ Menu endpoint: ${menuResponse.statusCode}');
      print('📋 Menu items count: ${menuResponse.data.length}');
      
      // Test auth endpoint (should fail without credentials)
      try {
        await dio.get('/mobile-orders/all');
        print('❌ Auth test failed - should require authentication');
      } catch (e) {
        print('✅ Auth test passed - endpoint requires authentication');
      }
      
      print('\n🎉 API connection test completed successfully!');
      
    } catch (e) {
      print('❌ API connection test failed:');
      print('Error: $e');
      print('\nTroubleshooting tips:');
      print('1. Make sure the backend server is running on port 3000');
      print('2. Check if MongoDB is running');
      print('3. Verify the baseUrl in api_service.dart matches your setup');
      print('4. For physical devices, update the baseUrl to your computer\'s IP address');
    }
  }
} 