import 'package:flutter/material.dart';
import 'pages/homepage.dart' as home;
import 'pages/login_page.dart';
import 'pages/registration.dart';
import 'pages/payment_page.dart';
import 'pages/order_history.dart';
import 'pages/invoice_page.dart';
import 'pages/notification_page.dart';
import 'pages/edit_profile_page.dart';
import 'pages/paymentmethod_page.dart';
import 'pages/address_page.dart';
import 'pages/profile_page.dart';
import 'pages/edit_payment_method_page.dart';
import 'pages/splash_screen.dart';
import 'pages/welcome_page.dart';
import 'pages/email_verification_page.dart';
import 'services/api_service.dart';

void main() {
  // Initialize API service
  ApiService().initialize();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RamenXpress',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: false,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD32D43), // True Red
          primary: const Color(0xFFD32D43),
          secondary: const Color(0xFF1A1A1A), // Black
          tertiary: const Color(0xFFFFFFFF), // White
          surface: Colors.white,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: const Color(0xFF1A1A1A),
        ),
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Color(0xFF1A1A1A)),
          titleTextStyle: TextStyle(
            color: Color(0xFF1A1A1A),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.15,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            backgroundColor: const Color(0xFFD32D43),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF1A1A1A), width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF1A1A1A), width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFD32D43), width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFD32D43), width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
          prefixIconColor: const Color(0xFF1A1A1A),
          labelStyle: const TextStyle(color: Color(0xFF1A1A1A)),
          hintStyle: TextStyle(color: Colors.grey[700]),
        ),
        cardTheme: const CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
          color: Colors.white,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A1A),
            letterSpacing: -0.5,
          ),
          displayMedium: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A1A),
            letterSpacing: -0.5,
          ),
          bodyLarge: TextStyle(
            fontSize: 16,
            color: Color(0xFF1A1A1A),
            letterSpacing: 0.15,
          ),
          bodyMedium: TextStyle(
            fontSize: 14,
            color: Color(0xFF1A1A1A),
            letterSpacing: 0.25,
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFFD32D43),
            textStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.25,
            ),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: Color(0xFF1A1A1A),
          thickness: 1,
          space: 24,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: Color(0xFFD32D43),
          unselectedItemColor: Color(0xFF1A1A1A),
        ),
        navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: Color(0xFFD32D43),
        ),
      ),
      home: const SplashScreen(),
      onGenerateRoute: (settings) {
        print('🔍 onGenerateRoute called with: ${settings.name}');
        print('📋 Arguments: ${settings.arguments}');
        
        switch (settings.name) {
          case '/email-verification':
            try {
              final args = settings.arguments as Map<String, dynamic>;
              print('✅ Creating EmailVerificationPage with email: ${args['email']}, purpose: ${args['purpose']}');
              return MaterialPageRoute(
                builder: (context) => EmailVerificationPage(
                  email: args['email'],
                  purpose: args['purpose'],
                ),
              );
            } catch (e) {
              print('❌ Error creating EmailVerificationPage: $e');
              return MaterialPageRoute(
                builder: (context) => Scaffold(
                  appBar: AppBar(title: const Text('Error')),
                  body: Center(
                    child: Text('Navigation Error: $e'),
                  ),
                ),
              );
            }
          default:
            print('❌ Route not found: ${settings.name}');
            return null;
        }
      },
      routes: {
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/home': (context) => const home.HomePage(),
        '/payment': (context) => const PaymentPage(),
        '/order-history': (context) => const OrderHistoryPage(),
        '/invoice': (context) => const InvoicePage(order: {}),
        '/notifications': (context) => const NotificationPage(),
        '/profile': (context) => const ProfilePage(),
        '/edit-profile': (context) => EditprofilePage(
          initialProfile: {
            'name': 'Minami',
            'email': 'minami@gmail.com',
            'phone': '+63 912 420 6969',
            'profileImage': 'assets/profilesgg.png',
          },
        ),
        '/payment-method': (context) => const PaymentmethodPage(),
        '/address': (context) => const AddressPage(),
        '/edit-payment-method': (context) => const EditPaymentMethodPage(),
        '/welcome': (context) => const WelcomePage(),
        '/email-verification-manual': (context) => const EmailVerificationPage(
          email: 'temp@example.com',
          purpose: 'registration',
        ),
      },
    );
  }
}
