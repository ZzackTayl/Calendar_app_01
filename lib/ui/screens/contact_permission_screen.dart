import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/theme_constants.dart';

class ContactPermissionScreen extends StatefulWidget {
  final int currentStep;
  final int totalSteps;
  final VoidCallback onPermissionGranted;
  final VoidCallback? onBack;

  const ContactPermissionScreen({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    required this.onPermissionGranted,
    this.onBack,
  });

  @override
  State<ContactPermissionScreen> createState() =>
      _ContactPermissionScreenState();
}

class _ContactPermissionScreenState extends State<ContactPermissionScreen> {
  bool _isLoading = false;

  Future<void> _handleAllowAccess() async {
    setState(() => _isLoading = true);

    final status = await Permission.contacts.request();

    if (status == PermissionStatus.granted) {
      setState(() => _isLoading = false);
      if (mounted) {
        widget.onPermissionGranted();
      }
    } else {
      setState(() => _isLoading = false);
      if (status == PermissionStatus.denied && mounted) {
        _showPermissionDeniedDialog();
      }
    }
  }

  void _handleSkip() {
    widget.onPermissionGranted(); // Skip contacts permission for now
  }

  void _showPermissionDeniedDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Permission Denied'),
        content: const Text(
          'To add connections from your contacts, please grant permission in Settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final colorScheme = theme.colorScheme;
    final progress = widget.currentStep / widget.totalSteps;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppGradients.backgroundFor(theme.brightness),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Step ${widget.currentStep} of ${widget.totalSteps}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: palette.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${(progress * 100).round()}%',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: palette.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: palette.subtleSurface,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 24),
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: palette.highlightFor(
                            AppColors.permissionOrange,
                          ),
                          shape: BoxShape.circle,
                          boxShadow: AppShadows.subtle,
                        ),
                        child: const Icon(
                          Icons.person,
                          size: 60,
                          color: AppColors.permissionOrange,
                        ),
                      ),
                      const SizedBox(height: 40),
                      Text(
                        'Access Your Contacts',
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: palette.textPrimary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'We need permission to access your contacts\nto help you find and add connections.',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: palette.textSecondary,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 32),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: palette.highlightFor(
                            AppColors.permissionOrange,
                          ),
                          borderRadius:
                              BorderRadius.circular(AppBorderRadius.large),
                          border: Border.all(
                            color: AppColors.permissionOrange.withValues(
                              alpha: 0.35,
                            ),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Privacy Promise',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppColors.permissionOrange,
                              ),
                            ),
                            const SizedBox(height: 16),
                            _buildPrivacyPoint(
                              palette,
                              'Contact data stays on your device',
                            ),
                            const SizedBox(height: 12),
                            _buildPrivacyPoint(
                              palette,
                              'We only show contacts you choose to add',
                            ),
                            const SizedBox(height: 12),
                            _buildPrivacyPoint(
                              palette,
                              'No contact information is shared without your permission',
                            ),
                            const SizedBox(height: 12),
                            _buildPrivacyPoint(
                              palette,
                              'You can revoke access anytime in Settings',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 40),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleAllowAccess,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.permissionOrange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                AppBorderRadius.medium,
                              ),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : Text(
                                  'Allow Contact Access',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: _handleSkip,
                          style: TextButton.styleFrom(
                            foregroundColor: palette.textSecondary,
                            textStyle: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          child: const Text('Skip for now'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: widget.onBack,
                        style: TextButton.styleFrom(
                          foregroundColor: palette.textPrimary,
                          textStyle: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: const Text('Back'),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPrivacyPoint(AppPalette palette, String text) {
    final bulletColor = palette.isDark
        ? AppColors.permissionOrangeLight
        : AppColors.permissionOrange;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '• ',
          style: TextStyle(
            fontSize: 16,
            color: bulletColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: bulletColor,
                  height: 1.4,
                ),
          ),
        ),
      ],
    );
  }
}
