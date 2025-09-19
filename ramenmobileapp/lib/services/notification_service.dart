import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
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

  // Success/Error SnackBar messages
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  static void showInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.info, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.blue,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  static void showWarning(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.warning, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  // Confirmation Dialogs
  static Future<bool?> showConfirmDialog({
    required BuildContext context,
    required String title,
    required String message,
    String confirmText = 'Confirm',
    String cancelText = 'Cancel',
    Color? confirmColor,
  }) async {
    if (Platform.isIOS) {
      return showCupertinoDialog<bool>(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            CupertinoDialogAction(
              child: Text(cancelText),
              onPressed: () => Navigator.of(context).pop(false),
            ),
            CupertinoDialogAction(
              isDestructiveAction: confirmColor == Colors.red,
              child: Text(confirmText),
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ],
        ),
      );
    } else {
      return showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(cancelText),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: confirmColor ?? Theme.of(context).primaryColor,
                foregroundColor: Colors.white,
              ),
              child: Text(confirmText),
            ),
          ],
        ),
      );
    }
  }

  static Future<bool?> showDeleteConfirmDialog({
    required BuildContext context,
    required String title,
    required String message,
  }) async {
    return showConfirmDialog(
      context: context,
      title: title,
      message: message,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: Colors.red,
    );
  }

  // Rich Alerts using AwesomeDialog
  static void showSuccessDialog({
    required BuildContext context,
    required String title,
    required String message,
    VoidCallback? onOkPressed,
  }) {
    AwesomeDialog(
      context: context,
      dialogType: DialogType.success,
      animType: AnimType.bottomSlide,
      title: title,
      desc: message,
      btnOkOnPress: onOkPressed,
      btnOkColor: Colors.green,
    ).show();
  }

  static void showErrorDialog({
    required BuildContext context,
    required String title,
    required String message,
    VoidCallback? onOkPressed,
  }) {
    AwesomeDialog(
      context: context,
      dialogType: DialogType.error,
      animType: AnimType.bottomSlide,
      title: title,
      desc: message,
      btnOkOnPress: onOkPressed,
      btnOkColor: Colors.red,
    ).show();
  }

  static void showWarningDialog({
    required BuildContext context,
    required String title,
    required String message,
    VoidCallback? onOkPressed,
  }) {
    AwesomeDialog(
      context: context,
      dialogType: DialogType.warning,
      animType: AnimType.bottomSlide,
      title: title,
      desc: message,
      btnOkOnPress: onOkPressed,
      btnOkColor: Colors.orange,
    ).show();
  }

  static void showInfoDialog({
    required BuildContext context,
    required String title,
    required String message,
    VoidCallback? onOkPressed,
  }) {
    AwesomeDialog(
      context: context,
      dialogType: DialogType.info,
      animType: AnimType.bottomSlide,
      title: title,
      desc: message,
      btnOkOnPress: onOkPressed,
      btnOkColor: Colors.blue,
    ).show();
  }

  static void showQuestionDialog({
    required BuildContext context,
    required String title,
    required String message,
    VoidCallback? onOkPressed,
    VoidCallback? onCancelPressed,
  }) {
    AwesomeDialog(
      context: context,
      dialogType: DialogType.question,
      animType: AnimType.bottomSlide,
      title: title,
      desc: message,
      btnOkOnPress: onOkPressed,
      btnCancelOnPress: onCancelPressed,
      btnOkColor: Colors.blue,
      btnCancelColor: Colors.grey,
    ).show();
  }

  // Loading Dialog
  static void showLoadingDialog(BuildContext context, {String message = 'Loading...'}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 20),
            Expanded(child: Text(message)),
          ],
        ),
      ),
    );
  }

  static void hideLoadingDialog(BuildContext context) {
    Navigator.of(context).pop();
  }
}
