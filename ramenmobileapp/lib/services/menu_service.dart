import '../models/menu_item.dart';
import 'api_service.dart';

class MenuService {
  final ApiService _apiService = ApiService();
  
  // Example categories
  List<String> categories = ['All', 'Ramen', 'Rice Bowl', 'Sides', 'Drinks', 'add-ons'];


  Future<List<MenuItem>> getMenuItemsByCategory(String category) async {
    try {
      if (category == 'All') {
        return await _apiService.getMenuItems();
      }
      return await _apiService.getMenuItemsByCategory(category);
    } catch (e) {
      print('Error fetching menu items: $e');
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
