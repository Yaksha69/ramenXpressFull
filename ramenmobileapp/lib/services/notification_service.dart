import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'dart:io' show Platform;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _notifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Request permissions for iOS
    if (Platform.isIOS) {
      await _notifications
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
    }

    _initialized = true;
  }

  void _onNotificationTapped(NotificationResponse response) {
    // Handle notification tap - could navigate to specific order
    print('Notification tapped: ${response.payload}');
  }

  Future<void> showOrderStatusNotification({
    required String orderId,
    required String status,
    required String title,
    required String body,
  }) async {
    if (!_initialized) await initialize();

    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'order_updates',
      'Order Updates',
      channelDescription: 'Notifications for order status updates',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      color: Color(0xFFD32D43),
      enableVibration: true,
      playSound: true,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      orderId.hashCode, // Use order ID hash as notification ID
      title,
      body,
      details,
      payload: orderId,
    );
  }

  Future<void> showInAppNotification(
    BuildContext context, {
    required String message,
    required Color backgroundColor,
    Duration duration = const Duration(seconds: 3),
  }) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              Icons.notifications_active,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  String getStatusMessage(String status, String orderId, {String? deliveryMethod, List<dynamic>? items}) {
    final method = deliveryMethod?.toLowerCase() ?? '';
    final isPickup = method == 'pickup';
    
    switch (status.toLowerCase()) {
      case 'preparing':
        return 'Your order #$orderId is now being prepared! 👨‍🍳';
      case 'ready':
        if (isPickup) {
          return 'Order #$orderId is ready for pickup! 🍜';
        } else {
          return 'Order #$orderId is ready for delivery! 🍜';
        }
      case 'outfordelivery':
      case 'out-for-delivery':
      case 'out for delivery':
        if (isPickup) {
          return 'Order #$orderId is ready for pickup! 🛍️';
        } else {
          return 'Order #$orderId is on the way to you! 🚗';
        }
      case 'delivered':
        if (isPickup) {
          return 'Order #$orderId has been picked up! Thank you! 🎉';
        } else {
          return 'Order #$orderId has been delivered! Enjoy your meal! 🎉';
        }
      case 'cancelled':
        return 'Order #$orderId has been cancelled 😔';
      default:
        return 'Order #$orderId status updated to $status';
    }
  }

  Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'preparing':
        return Colors.orange;
      case 'ready':
        return Colors.blue;
      case 'outfordelivery':
      case 'out for delivery':
        return Colors.green;
      case 'delivered':
        return Colors.purple;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
