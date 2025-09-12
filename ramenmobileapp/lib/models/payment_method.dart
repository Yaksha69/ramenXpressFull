import 'package:flutter/material.dart';

enum PaymentType {
  cash,
  gcash,
  maya,
}

class PaymentMethod {
  final String id;
  final PaymentType type;
  final String title;
  final String accountNumber;
  final bool isDefault;

  PaymentMethod({
    required this.id,
    required this.type,
    required this.title,
    this.accountNumber = '',
    this.isDefault = false,
  });

  String get displayName {
    switch (type) {
      case PaymentType.cash:
        return 'Cash on Delivery';
      case PaymentType.gcash:
        return 'GCash';
      case PaymentType.maya:
        return 'Maya';
    }
  }

  IconData get icon {
    switch (type) {
      case PaymentType.cash:
        return Icons.payments;
      case PaymentType.gcash:
        return Icons.account_balance_wallet;
      case PaymentType.maya:
        return Icons.credit_card;
    }
  }

  String? get logoAsset {
    switch (type) {
      case PaymentType.cash:
        return null;
      case PaymentType.gcash:
        return 'assets/gcash_logo.png';
      case PaymentType.maya:
        return 'assets/paymaya_logo.png';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toString(),
      'title': title,
      'accountNumber': accountNumber,
      'isDefault': isDefault,
    };
  }

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'],
      type: PaymentType.values.firstWhere(
        (e) => e.name.toLowerCase() == (json['type']?.toString().toLowerCase() ?? ''),
        orElse: () => PaymentType.cash,
      ),
      title: json['title'],
      accountNumber: json['accountNumber'] ?? json['mobileNumber'] ?? '',
      isDefault: json['isDefault'] ?? false,
    );
  }
} 