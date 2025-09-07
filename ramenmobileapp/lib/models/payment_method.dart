import 'package:flutter/material.dart';

enum PaymentType {
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
    required this.accountNumber,
    this.isDefault = false,
  });

  String get displayName {
    String lastDigits = accountNumber.length >= 4
        ? accountNumber.substring(accountNumber.length - 4)
        : accountNumber;
    switch (type) {
      case PaymentType.gcash:
        return 'GCash •••• $lastDigits';
      case PaymentType.maya:
        return 'Maya •••• $lastDigits';
    }
  }

  IconData get icon {
    switch (type) {
      case PaymentType.gcash:
        return Icons.account_balance_wallet;
      case PaymentType.maya:
        return Icons.account_balance;
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
        orElse: () => PaymentType.gcash,
      ),
      title: json['title'],
      accountNumber: json['accountNumber'] ?? json['mobileNumber'] ?? '',
      isDefault: json['isDefault'] ?? false,
    );
  }
} 