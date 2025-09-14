import 'package:flutter/material.dart';

class NotificationCounterService extends ChangeNotifier {
  static final NotificationCounterService _instance = NotificationCounterService._internal();
  factory NotificationCounterService() => _instance;
  NotificationCounterService._internal();

  int _unreadCount = 0;

  int get unreadCount => _unreadCount;

  bool get hasUnreadNotifications => _unreadCount > 0;

  void incrementUnreadCount() {
    _unreadCount++;
    notifyListeners();
  }

  void decrementUnreadCount() {
    if (_unreadCount > 0) {
      _unreadCount--;
      notifyListeners();
    }
  }

  void markAllAsRead() {
    _unreadCount = 0;
    notifyListeners();
  }

  void setUnreadCount(int count) {
    _unreadCount = count;
    notifyListeners();
  }
}
