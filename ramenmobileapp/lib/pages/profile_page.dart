import 'package:flutter/material.dart';
import 'edit_profile_page.dart';
import '../services/api_service.dart';


class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, String> profile = {
    'name': 'Loading...',
    'email': 'Loading...',
    'phone': 'Loading...',
    'profileImage': 'assets/profilesgg.png',
  };
  bool isLoading = true;
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    try {
      await _apiService.loadToken();
      final response = await _apiService.getCustomerProfile();
      final customerData = response['data'] ?? response;
      
      setState(() {
        profile = {
          'name': '${customerData['firstName'] ?? ''} ${customerData['lastName'] ?? ''}'.trim(),
          'email': customerData['email'] ?? '',
          'phone': customerData['phone'] ?? 'Not provided',
          'profileImage': customerData['profileImage'] ?? 'assets/profilesgg.png',
        };
        isLoading = false;
      });
    } catch (e) {
      print('Error loading user profile: $e');
      setState(() {
        profile = {
          'name': 'Error loading profile',
          'email': 'Error loading email',
          'phone': 'Error loading phone',
          'profileImage': 'assets/profilesgg.png',
        };
        isLoading = false;
      });
    }
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 4),
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
                letterSpacing: 0.3,
              ),
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, VoidCallback onTap, {Color? iconColor}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            spreadRadius: 0,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: (iconColor ?? const Color(0xFFD32D43)).withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: iconColor ?? const Color(0xFFD32D43),
            size: 22,
          ),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1A1A1A),
            letterSpacing: -0.2,
          ),
        ),
        trailing: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: Colors.grey.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.arrow_forward_ios,
            size: 14,
            color: Color(0xFF666666),
          ),
        ),
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }

  Widget _buildProfileImage(String imagePath) {
    final imageUrl = ApiService.getImageUrl(imagePath);
    final isNetwork = ApiService.isNetworkImage(imagePath);
    
    if (isNetwork) {
      return Image.network(
        imageUrl,
        width: 80,
        height: 80,
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) {
          return Image.asset(
            'assets/profilesgg.png',
            width: 80,
            height: 80,
            fit: BoxFit.fill,
          );
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            width: 80,
            height: 80,
            color: Colors.grey[200],
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          );
        },
      );
    } else {
      return Image.asset(
        imageUrl,
        width: 80,
        height: 80,
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) {
          return Image.asset(
            'assets/profilesgg.png',
            width: 80,
            height: 80,
            fit: BoxFit.fill,
          );
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            automaticallyImplyLeading: false,
            floating: false,
            pinned: true,
            expandedHeight: 120,
            backgroundColor: Colors.transparent,
            elevation: 0,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFFD32D43),
                      Color(0xFFE85A4F),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 15, 20, 15),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 10),
                        const Text(
                          'My Profile',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Manage your account and preferences',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  // Profile Header Card - Modern Design
                  Transform.translate(
                    offset: const Offset(0, -10),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          // Profile Image with Status Indicator
                          Stack(
                            children: [
                              Container(
                                width: 100,
                                height: 100,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: [
                                      const Color(0xFFD32D43).withOpacity(0.2),
                                      const Color(0xFFE85A4F).withOpacity(0.2),
                                    ],
                                  ),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: ClipOval(
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.grey[100],
                                        shape: BoxShape.circle,
                                      ),
                                      child: _buildProfileImage(profile['profileImage']!),
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: 8,
                                right: 8,
                                child: Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF4CAF50),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          
                          // User Info
                          Text(
                            profile['name']!,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1A1A1A),
                              letterSpacing: 0.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            profile['email']!,
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          if (profile['phone']! != 'Not provided') ...[
                            const SizedBox(height: 2),
                            Text(
                              profile['phone']!,
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[500],
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                          
                          const SizedBox(height: 20),
                          
                          // Edit Profile Button - Modern Style
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () async {
                                final updatedProfile = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => EditprofilePage(initialProfile: profile),
                                  ),
                                );
                                if (updatedProfile != null) {
                                  setState(() {
                                    profile = Map<String, String>.from(updatedProfile);
                                  });
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFD32D43),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.edit_outlined, size: 20),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Edit Profile',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Quick Actions Section
                  _buildSection(
                    'Quick Actions',
                    [
                      _buildMenuItem(
                        Icons.receipt_long_outlined,
                        'Order History',
                        () => Navigator.pushReplacementNamed(context, '/order-history'),
                        iconColor: const Color(0xFF2196F3),
                      ),
                      _buildMenuItem(
                        Icons.notifications_outlined,
                        'Notifications',
                        () => Navigator.pushNamed(context, '/notifications'),
                        iconColor: const Color(0xFFFF9800),
                      ),
                    ],
                  ),

                  // Account Settings Section
                  _buildSection(
                    'Account Settings',
                    [
                      _buildMenuItem(
                        Icons.person_outline,
                        'Personal Information',
                        () async {
                          final updatedProfile = await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => EditprofilePage(initialProfile: profile),
                            ),
                          );
                          if (updatedProfile != null) {
                            setState(() {
                              profile = Map<String, String>.from(updatedProfile);
                            });
                          }
                        },
                        iconColor: const Color(0xFF9C27B0),
                      ),
                      _buildMenuItem(
                        Icons.location_on_outlined,
                        'Delivery Addresses',
                        () async {
                          final result = await Navigator.pushNamed(context, '/address');
                          if (result == true) {
                            setState(() {});
                          }
                        },
                        iconColor: const Color(0xFF4CAF50),
                      ),
                      _buildMenuItem(
                        Icons.credit_card_outlined,
                        'Payment Methods',
                        () => Navigator.pushNamed(context, '/payment-method'),
                        iconColor: const Color(0xFF607D8B),
                      ),
                    ],
                  ),

                  // Support Section
                  _buildSection(
                    'Support & Help',
                    [
                      _buildMenuItem(
                        Icons.help_outline,
                        'Help Center',
                        () => Navigator.pushNamed(context, '/help'),
                        iconColor: const Color(0xFF795548),
                      ),
                      _buildMenuItem(
                        Icons.feedback_outlined,
                        'Send Feedback',
                        () => Navigator.pushNamed(context, '/feedback'),
                        iconColor: const Color(0xFF3F51B5),
                      ),
                    ],
                  ),

                  // Logout Button - Modern Design
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: ElevatedButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                            ),
                            title: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFD32D43).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.logout,
                                    color: Color(0xFFD32D43),
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Logout',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            content: const Text(
                              'Are you sure you want to logout from your account?',
                              style: TextStyle(fontSize: 16),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                ),
                                child: Text(
                                  'Cancel',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              ElevatedButton(
                                onPressed: () async {
                                  final apiService = ApiService();
                                  await apiService.logout();
                                  
                                  if (mounted) {
                                    Navigator.pushReplacementNamed(context, '/login');
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFD32D43),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: const Text(
                                  'Logout',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFFD32D43),
                        elevation: 0,
                        side: const BorderSide(color: Color(0xFFD32D43), width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.logout, size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Logout',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              spreadRadius: 0,
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: BottomNavigationBar(
              currentIndex: 3, // Profile is selected
              onTap: (index) {
                switch (index) {
                  case 0:
                    Navigator.pushReplacementNamed(context, '/home');
                    break;
                  case 1:
                    Navigator.pushReplacementNamed(context, '/payment');
                    break;
                  case 2:
                    Navigator.pushReplacementNamed(context, '/order-history');
                    break;
                  case 3:
                    // Already on profile page
                    break;
                }
              },
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.home_outlined),
                  activeIcon: Icon(Icons.home),
                  label: '',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.shopping_cart_outlined),
                  activeIcon: Icon(Icons.shopping_cart),
                  label: '',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.history_outlined),
                  activeIcon: Icon(Icons.history),
                  label: '',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  activeIcon: Icon(Icons.person),
                  label: '',
                ),
              ],
              selectedItemColor: const Color(0xFFD32D43),
              unselectedItemColor: Colors.grey[400],
              showSelectedLabels: false,
              showUnselectedLabels: false,
              backgroundColor: Colors.transparent,
              type: BottomNavigationBarType.fixed,
              elevation: 0,
            ),
          ),
        ),
      ),
    );
  }
}