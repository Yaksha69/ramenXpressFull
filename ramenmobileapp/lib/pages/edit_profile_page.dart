import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class EditprofilePage extends StatefulWidget {
  final Map<String, String> initialProfile;
  const EditprofilePage({super.key, required this.initialProfile});

  @override
  State<EditprofilePage> createState() => _EditprofilePageState();
}

class _EditprofilePageState extends State<EditprofilePage> {
  late TextEditingController nameController;
  late TextEditingController emailController;
  late TextEditingController phoneController;
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    nameController = TextEditingController(text: widget.initialProfile['name'] ?? '');
    emailController = TextEditingController(text: widget.initialProfile['email'] ?? '');
    phoneController = TextEditingController(text: widget.initialProfile['phone'] ?? '');
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      // Show image source selection dialog
      final ImageSource? source = await _showImageSourceDialog();
      if (source == null) return;

      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 80,
        requestFullMetadata: false,
      );

      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
        
        NotificationService.showSuccess(
          context,
          'Profile photo selected! Save to update.',
        );
      }
    } on PlatformException catch (e) {
      String errorMessage = 'Failed to select image';
      if (e.code == 'photo_access_denied') {
        errorMessage = 'Photo access denied. Please enable gallery permissions in settings.';
      } else if (e.code == 'camera_access_denied') {
        errorMessage = 'Camera access denied. Please enable camera permissions in settings.';
      } else {
        errorMessage = 'Error: ${e.message ?? e.code}';
      }
      
      NotificationService.showError(
        context,
        errorMessage,
      );
    } catch (e) {
      NotificationService.showError(
        context,
        'Failed to select image: $e',
      );
    }
  }

  Future<ImageSource?> _showImageSourceDialog() async {
    return showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Image Source'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  void _saveProfile() async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final apiService = ApiService();
      
      // Parse the full name into first and last name
      final fullName = nameController.text.trim();
      final nameParts = fullName.split(' ');
      final firstName = nameParts.isNotEmpty ? nameParts.first : '';
      final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
      
      // Prepare update data
      final updateData = {
        'firstName': firstName,
        'lastName': lastName,
        'email': emailController.text.trim(),
        'phone': phoneController.text.trim(),
      };
      
      // Call backend API to update profile
      final response = await apiService.updateCustomerProfile(updateData);
      
      // Close loading dialog
      if (mounted) Navigator.pop(context);
      
      if (response['success'] == true) {
        // Show success message
        NotificationService.showSuccess(
          context,
          'Profile updated successfully! ✅',
        );
        
        // Return updated profile data
        final updatedProfile = {
          'name': fullName,
          'email': emailController.text.trim(),
          'phone': phoneController.text.trim(),
          'profileImage': widget.initialProfile['profileImage'] ?? '',
        };
        
        Navigator.pop(context, updatedProfile);
      } else {
        // Show error message
        NotificationService.showError(
          context,
          response['message'] ?? 'Failed to update profile',
        );
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) Navigator.pop(context);
      
      // Show error message
      NotificationService.showError(
        context,
        'Error updating profile: $e',
      );
    }
  }

  ImageProvider _getProfileImage() {
    // If user selected a new image, show that
    if (_selectedImage != null) {
      return FileImage(_selectedImage!);
    }
    
    final imagePath = widget.initialProfile['profileImage'] ?? 'assets/profilesgg.png';
    final imageUrl = ApiService.getImageUrl(imagePath);
    final isNetwork = ApiService.isNetworkImage(imagePath);
    
    if (isNetwork) {
      return NetworkImage(imageUrl);
    } else {
      return AssetImage(imageUrl);
    }
  }

  Widget _buildModernTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1A1A1A),
              letterSpacing: -0.1,
            ),
          ),
          const SizedBox(height: 8),
          Container(
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
            child: TextFormField(
              controller: controller,
              keyboardType: keyboardType,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1A1A1A),
              ),
              decoration: InputDecoration(
                prefixIcon: Container(
                  margin: const EdgeInsets.all(12),
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD32D43).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: const Color(0xFFD32D43),
                  ),
                ),
                hintText: 'Enter your $label',
                hintStyle: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 16,
                  fontWeight: FontWeight.w400,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(
                    color: Color(0xFFD32D43),
                    width: 2,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF5F5F5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF1A1A1A), size: 18),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        title: const Text(
          "Edit Profile",
          style: TextStyle(
            color: Color(0xFF1A1A1A),
            fontSize: 18,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
        centerTitle: true,
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            child: ElevatedButton(
              onPressed: _saveProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD32D43),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                "Save",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Photo Section
            Center(
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: _pickImage,
                    child: Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: const Color(0xFFE0E0E0),
                              width: 3,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                spreadRadius: 0,
                                blurRadius: 20,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 57,
                            backgroundImage: _getProfileImage(),
                          ),
                        ),
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFD32D43),
                            border: Border.all(
                              color: Colors.white,
                              width: 3,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFD32D43).withOpacity(0.3),
                                spreadRadius: 0,
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.camera_alt,
                            size: 18,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Tap to change photo',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            
            // Form Section
            const Text(
              'Personal Information',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1A1A),
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 20),
            _buildModernTextField(
              controller: nameController,
              label: 'Full Name',
              icon: Icons.person_outline,
              keyboardType: TextInputType.name,
            ),
            _buildModernTextField(
              controller: emailController,
              label: 'Email Address',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
            ),
            _buildModernTextField(
              controller: phoneController,
              label: 'Phone Number',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            
            const SizedBox(height: 40),
            
            // Save Button (Alternative)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saveProfile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD32D43),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  shadowColor: const Color(0xFFD32D43).withOpacity(0.3),
                ),
                child: const Text(
                  'Save Changes',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
