import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:permission_handler/permission_handler.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  /// Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  /// Check location permission status
  Future<LocationPermission> checkPermission() async {
    return await Geolocator.checkPermission();
  }

  /// Request location permission
  Future<LocationPermission> requestPermission() async {
    return await Geolocator.requestPermission();
  }

  /// Get current position with error handling
  Future<Position?> getCurrentPosition() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled. Please enable location services.');
      }

      // Check permissions
      LocationPermission permission = await checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permission denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permissions are permanently denied. Please enable in settings.');
      }

      // Get position
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      return position;
    } catch (e) {
      print('Error getting current position: $e');
      rethrow;
    }
  }

  /// Get address from coordinates
  Future<String> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(latitude, longitude);
      
      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        return _formatAddress(place);
      }
      
      return 'Unknown location';
    } catch (e) {
      print('Error getting address from coordinates: $e');
      return 'Unable to get address';
    }
  }

  /// Get coordinates from address string
  Future<LatLng?> getCoordinatesFromAddress(String address) async {
    try {
      List<Location> locations = await locationFromAddress(address);
      
      if (locations.isNotEmpty) {
        Location location = locations[0];
        return LatLng(location.latitude, location.longitude);
      }
      
      return null;
    } catch (e) {
      print('Error getting coordinates from address: $e');
      return null;
    }
  }

  /// Format placemark into readable address
  String _formatAddress(Placemark place) {
    List<String> addressParts = [];
    
    if (place.street != null && place.street!.isNotEmpty) {
      addressParts.add(place.street!);
    }
    if (place.subLocality != null && place.subLocality!.isNotEmpty) {
      addressParts.add(place.subLocality!);
    }
    if (place.locality != null && place.locality!.isNotEmpty) {
      addressParts.add(place.locality!);
    }
    if (place.administrativeArea != null && place.administrativeArea!.isNotEmpty) {
      addressParts.add(place.administrativeArea!);
    }
    if (place.country != null && place.country!.isNotEmpty) {
      addressParts.add(place.country!);
    }
    
    return addressParts.join(', ');
  }

  /// Calculate distance between two points in meters
  double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  /// Calculate delivery fee based on distance (example implementation)
  double calculateDeliveryFee(double distanceInMeters) {
    // Base delivery fee
    double baseFee = 50.0;
    
    // Additional fee per kilometer beyond 5km
    double distanceInKm = distanceInMeters / 1000;
    if (distanceInKm > 5.0) {
      double additionalKm = distanceInKm - 5.0;
      baseFee += additionalKm * 10.0; // ₱10 per additional km
    }
    
    return baseFee;
  }

  /// Check if delivery is available to the given coordinates
  Future<bool> isDeliveryAvailable(double latitude, double longitude) async {
    // Example: Check if location is within delivery radius
    // You can customize this based on your restaurant's delivery zones
    
    // Restaurant location (example coordinates - replace with actual)
    const double restaurantLat = 14.5995; // Manila
    const double restaurantLng = 120.9842;
    
    double distance = calculateDistance(
      restaurantLat,
      restaurantLng,
      latitude,
      longitude,
    );
    
    // Maximum delivery radius: 20km
    return distance <= 20000; // 20km in meters
  }

  /// Open device location settings
  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  /// Open app settings for permission management
  Future<void> openAppSettings() async {
    await openAppSettings();
  }
}
