import '../models/menu_item.dart';
import 'api_service.dart';

class MenuService {
  final ApiService _apiService = ApiService();
  
  // Categories matching backend Menu model
  List<String> categories = ['All', 'ramen', 'rice bowls', 'side dishes', 'sushi', 'party trays', 'add-ons', 'drinks'];


  Future<List<MenuItem>> getMenuItemsByCategory(String category) async {
    try {
      print('🔍 MenuService: Fetching items for category: $category');
      if (category == 'All') {
        print('📋 MenuService: Fetching all menu items');
        final items = await _apiService.getMenuItems();
        print('✅ MenuService: Got ${items.length} items for All category');
        return items;
      }
      print('📋 MenuService: Fetching items for specific category: $category');
      final items = await _apiService.getMenuItemsByCategory(category);
      print('✅ MenuService: Got ${items.length} items for category: $category');
      return items;
    } catch (e) {
      print('❌ MenuService Error fetching menu items for category $category: $e');
      // Return empty list if API fails
      return [];
    }
  }

  Future<List<MenuItem>> searchMenuItems(String query) async {
    try {
      final allItems = await _apiService.getMenuItems();
      return allItems
          .where((item) => item.name.toLowerCase().contains(query.toLowerCase()))
          .toList();
    } catch (e) {
      print('Error searching menu items: $e');
      // Return empty list if API fails
      return [];
    }
  }
}
