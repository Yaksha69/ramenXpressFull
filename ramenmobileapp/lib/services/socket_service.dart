import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/material.dart';
import 'notification_service.dart';

typedef OrderStatusUpdateCallback = void Function(Map<String, dynamic> data);

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? socket;
  OrderStatusUpdateCallback? onOrderStatusUpdate;
  BuildContext? _currentContext;
  final NotificationService _notificationService = NotificationService();

  void connect() {
    if (socket != null && socket!.connected) return;
    
    // Use localhost for development
    String socketUrl = 'http://192.168.0.106:3000'; // Your computer's local IP
    
    socket = IO.io(socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    socket?.on('connect', (_) {
      print('✅ Connected to Socket.IO server at $socketUrl');
    });

    socket?.on('connect_error', (error) {
      print('❌ Socket connection error: $error');
    });

    socket?.on('orderStatusUpdate', (data) {
      print('🔔 Order status update received: $data');
      _handleOrderStatusUpdate(Map<String, dynamic>.from(data));
      if (onOrderStatusUpdate != null) {
        onOrderStatusUpdate!(Map<String, dynamic>.from(data));
      }
    });

    socket?.on('disconnect', (_) => print('Disconnected from Socket.IO server'));
  }

  void disconnect() {
    socket?.disconnect();
  }

  void setContext(BuildContext context) {
    _currentContext = context;
  }

  void _handleOrderStatusUpdate(Map<String, dynamic> data) async {
    print('🔔 Processing order status update: $data');
    
    final orderId = data['orderId']?.toString() ?? '';
    final status = data['status']?.toString() ?? '';
    final order = data['order'] as Map<String, dynamic>?;
    
    if (orderId.isEmpty || status.isEmpty) {
      print('❌ Missing orderId or status in notification data');
      return;
    }

    // Extract order details for dynamic notification
    final deliveryMethod = order?['deliveryMethod']?.toString() ?? 
                          data['deliveryMethod']?.toString() ?? '';
    final items = order?['items'] as List<dynamic>? ?? 
                 data['items'] as List<dynamic>? ?? [];

    try {
      // Initialize notification service
      await _notificationService.initialize();

      // Show push notification with dynamic data
      final message = _notificationService.getStatusMessage(
        status, 
        orderId, 
        deliveryMethod: deliveryMethod,
        items: items,
      );
      
      print('📱 Showing notification: $message');
      
      await _notificationService.showOrderStatusNotification(
        orderId: orderId,
        status: status,
        title: 'RamenXpress Order Update',
        body: message,
      );

      // Show in-app notification if context is available
      if (_currentContext != null) {
        final color = _notificationService.getStatusColor(status);
        _notificationService.showInAppNotification(
          _currentContext!,
          message: message,
          backgroundColor: color,
        );
      }
    } catch (e) {
      print('⚠️ Notification failed: $e');
      // Still show in-app notification as fallback
      if (_currentContext != null) {
        final fallbackMessage = 'Order #$orderId status updated to $status';
        NotificationService.showInfo(
          _currentContext!,
          fallbackMessage,
        );
      }
    }
  }
} 