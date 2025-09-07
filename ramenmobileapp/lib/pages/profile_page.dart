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
    'name': 'Minami',
    'email': 'minami@gmail.com',
    'phone': '+63 912 420 6969',
    'profileImage': 'assets/profilesgg.png',
  };

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(red: 128, green: 128, blue: 128, alpha: 26),
            spreadRadius: 1,
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF1A1A1A)),
      title: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF1A1A1A),
          fontSize: 16,
        ),
      ),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Color(0xFF1A1A1A)),
      onTap: onTap,
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
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            pinned: true,
            expandedHeight: 120,
            backgroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: Colors.white,
                padding: const EdgeInsets.only(top: 60, left: 16, right: 16),
                child: const Row(
                  children: [
                    Text(
                      'Profile',
                      style: TextStyle(
                        color: Color(0xFF1A1A1A),
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  // Profile Header
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(15),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey.withValues(red: 128, green: 128, blue: 128, alpha: 26),
                          spreadRadius: 1,
                          blurRadius: 5,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        ClipOval(
                          child: Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                            ),
                            child: _buildProfileImage(profile['profileImage']!),
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                profile['name']!,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                profile['email']!,
                                style: const TextStyle(
                                  color: Color(0xFF1A1A1A),
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton(
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
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Color(0xFFD32D43)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                child: const Text(
                                  'Edit Profile',
                                  style: TextStyle(color: Color(0xFFD32D43)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

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
                      ),
                      _buildMenuItem(
                        Icons.location_on_outlined,
                        'Delivery Addresses',
                        () async {
                          final result = await Navigator.pushNamed(context, '/address');
                          if (result == true) {
                            // Refresh the profile page if needed
                            setState(() {
                              // Trigger a refresh of any data that might have changed
                            });
                          }
                        },
                      ),
                      _buildMenuItem(
                        Icons.credit_card_outlined,
                        'Payment Methods',
                        () {
                          Navigator.pushNamed(context, '/payment-method');
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Logout Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Logout'),
                            content: const Text('Are you sure you want to logout?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () {
                                  Navigator.pushReplacementNamed(context, '/login');
                                },
                                child: const Text(
                                  'Logout',
                                  style: TextStyle(color: Color(0xFFD32D43)),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD32D43),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Logout',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withValues(red: 128, green: 128, blue: 128, alpha: 10),
              spreadRadius: 1,
              blurRadius: 10,
              offset: const Offset(0, -1),
            ),
          ],
        ),
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
            BottomNavigationBarItem(icon: Icon(Icons.home), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.shopping_cart), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.history), label: ''),
            BottomNavigationBarItem(icon: Icon(Icons.person), label: ''),
          ],
          selectedItemColor: const Color(0xFFD32D43),
          unselectedItemColor: const Color(0xFF1A1A1A),
          showSelectedLabels: false,
          showUnselectedLabels: false,
          backgroundColor: Colors.white,
          type: BottomNavigationBarType.fixed,
        ),
      ),
    );
  }
}