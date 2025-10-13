import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../logic/providers/ui_state_providers.dart';

/// Settings screen UI
///
/// Focuses on front-end composition using static data placeholders.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Ensure calendar tab state remains accurate when navigating from settings
    ref.read(currentTabProvider.notifier).setTab(4);

    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                child: Text(
                  'Settings',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Profile Section
              _ProfileSection(onEditProfile: () {}),

              const SizedBox(height: 16),

              // Appearance Section
              _SettingsSection(
                title: 'Appearance',
                children: [
                  _SimpleSettingRow(
                    label: 'Dark Mode',
                    value: 'Off',
                    valueColor: Colors.grey,
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Calendar Section
              _SettingsSection(
                title: 'Calendar',
                children: [
                  _SimpleSettingRow(
                    label: 'Google Calendar Sync',
                    value: 'Connected',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _SimpleSettingRow(
                    label: 'Default Event Privacy',
                    value: 'Normal',
                    valueColor: Colors.grey,
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _SimpleSettingRow(
                    label: 'Time Zone',
                    value: 'PST',
                    valueColor: Colors.grey,
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Notifications Section
              _SettingsSection(
                title: 'Notifications',
                children: [
                  _SimpleSettingRow(
                    label: 'Event Reminders',
                    value: 'On',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _SimpleSettingRow(
                    label: 'Partner Invitations',
                    value: 'On',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _SimpleSettingRow(
                    label: 'Calendar Changes',
                    value: 'On',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Rescheduling Events & Reminders Section
              _SettingsSection(
                title: 'Rescheduling Events & Reminders',
                children: [
                  _DetailedSettingRow(
                    title: 'SMS Reschedule Reminders',
                    subtitle:
                        'Allow contacts to reschedule via SMS AI assistant',
                    value: 'On',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _DetailedSettingRow(
                    title: 'Auto SMS Cancellation Alerts',
                    subtitle: 'AI sends SMS reminders when events are canceled',
                    value: 'On',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _DetailedSettingRow(
                    title: 'In-App Notifications',
                    subtitle: 'Request notifications for you and other parties',
                    value: 'On',
                    valueColor: const Color(0xFF4CAF50),
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Privacy & Security Section
              _SettingsSection(
                title: 'Privacy & Security',
                children: [
                  _ActionSettingRow(
                    label: 'Privacy Settings',
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _ActionSettingRow(
                    label: 'Data Export',
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _ActionSettingRow(
                    label: 'Delete Account',
                    textColor: Colors.red,
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Support Section
              _SettingsSection(
                title: 'Support',
                children: [
                  _ActionSettingRow(
                    label: 'Updates & Guides',
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _ActionSettingRow(
                    label: 'Help Center',
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _ActionSettingRow(
                    label: 'Contact Support',
                    onTap: () {},
                  ),
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
                  _ActionSettingRow(
                    label: 'Send Feedback',
                    onTap: () {},
                  ),
                ],
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({required this.onEditProfile});

  final VoidCallback onEditProfile;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Profile',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1F2C3E),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFE1D5F7),
                ),
                child: const Icon(
                  Icons.person,
                  size: 32,
                  color: Color(0xFF8B7BA8),
                ),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Name',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1F2C3E),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'your.email@example.com',
                      style: TextStyle(
                        fontSize: 15,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onEditProfile,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF1F2C3E),
                side: const BorderSide(color: Color(0xFFE5E7EB), width: 1.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.white,
              ),
              child: const Text(
                'Edit Profile',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1F2C3E),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1F2C3E),
              ),
            ),
          ),
          ...children,
        ],
      ),
    );
  }
}

class _SimpleSettingRow extends StatelessWidget {
  const _SimpleSettingRow({
    required this.label,
    required this.value,
    required this.valueColor,
    required this.onTap,
  });

  final String label;
  final String value;
  final Color valueColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2C3E),
                ),
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: valueColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailedSettingRow extends StatelessWidget {
  const _DetailedSettingRow({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.valueColor,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String value;
  final Color valueColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F2C3E),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: valueColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionSettingRow extends StatelessWidget {
  const _ActionSettingRow({
    required this.label,
    required this.onTap,
    this.textColor,
  });

  final String label;
  final VoidCallback onTap;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: textColor ?? const Color(0xFF1F2C3E),
          ),
        ),
      ),
    );
  }
}
