import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../logic/providers/settings_providers.dart';
import '../../domain/event.dart';

/// Settings screen UI
///
/// Focuses on front-end composition using interactive local-only state so the
/// frontend can be exercised before the backend is ready.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsControllerProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      body: SafeArea(
        child: settingsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _SettingsError(error: error.toString()),
          data: (settings) {
            final controller = ref.read(settingsControllerProvider.notifier);
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _SettingsContent(
                settings: settings,
                controller: controller,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SettingsContent extends StatelessWidget {
  const _SettingsContent({
    required this.settings,
    required this.controller,
  });

  final SettingsState settings;
  final SettingsController controller;

  static const _timeZones = <String>[
    'Pacific Time (PST)',
    'Mountain Time (MST)',
    'Central Time (CST)',
    'Eastern Time (EST)',
    'UTC / GMT',
    'Central European Time (CET)',
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
        _ProfileSection(
          onEditProfile: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile editing will be available soon.'),
            ),
          ),
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Appearance',
          children: [
            _SettingToggleRow(
              label: 'Dark Mode',
              subtitle: 'Switch to a darker color palette',
              value: settings.darkModeEnabled,
              onChanged: (_) => controller.toggleDarkMode(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Calendar',
          children: [
            _SettingToggleRow(
              label: 'Google Calendar Sync',
              subtitle: settings.googleSyncEnabled
                  ? 'Connected to Google Calendar'
                  : 'Not connected',
              value: settings.googleSyncEnabled,
              onChanged: (_) => controller.toggleGoogleSync(),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _SimpleSettingRow(
              label: 'Default Event Privacy',
              value: _privacyLabel(settings.defaultPrivacy),
              valueColor: _privacyColor(settings.defaultPrivacy),
              onTap: () => _showPrivacyPicker(context),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _SimpleSettingRow(
              label: 'Time Zone',
              value: settings.timeZone,
              valueColor: const Color(0xFF1F2C3E),
              onTap: () => _showTimeZonePicker(context),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Notifications',
          children: [
            _SettingToggleRow(
              label: 'Event Reminders',
              subtitle: 'Get nudges before things start',
              value: settings.eventRemindersEnabled,
              onChanged: (_) => controller.toggleEventReminders(),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _SettingToggleRow(
              label: 'Partner Invitations',
              subtitle: 'Alerts when invitations are accepted or declined',
              value: settings.partnerInvitesEnabled,
              onChanged: (_) => controller.togglePartnerInvites(),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _SettingToggleRow(
              label: 'Calendar Changes',
              subtitle: 'Updates when shared events change',
              value: settings.calendarChangesEnabled,
              onChanged: (_) => controller.toggleCalendarChanges(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Rescheduling Events & Reminders',
          children: [
            _SettingToggleRow(
              label: 'SMS Reschedule Reminders',
              subtitle: 'Allow contacts to reschedule via SMS AI assistant',
              value: settings.smsRescheduleEnabled,
              onChanged: (_) => controller.toggleSmsReschedule(),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _SettingToggleRow(
              label: 'Auto SMS Cancellation Alerts',
              subtitle: 'SMS alerts when events are canceled',
              value: settings.autoSmsCancellationEnabled,
              onChanged: (_) => controller.toggleAutoSmsCancellation(),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _SettingToggleRow(
              label: 'In-App Notifications',
              subtitle: 'Request notifications for you and other parties',
              value: settings.inAppNotificationsEnabled,
              onChanged: (_) => controller.toggleInAppNotifications(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Privacy & Security',
          children: [
            _ActionSettingRow(
              label: 'Privacy Settings',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Privacy settings panel is coming soon.'),
                ),
              ),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _ActionSettingRow(
              label: 'Data Export',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Data export options will be available later.'),
                ),
              ),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _ActionSettingRow(
              label: 'Delete Account',
              textColor: Colors.red,
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Account deletion will require backend setup.'),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Support',
          children: [
            _ActionSettingRow(
              label: 'Updates & Guides',
              onTap: () => context.push('/updates-guides'),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _ActionSettingRow(
              label: 'Help Center',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Help Center will launch with the backend.'),
                ),
              ),
            ),
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
            _ActionSettingRow(
              label: 'Contact Support',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Support messaging will be wired up next.'),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _showPrivacyPicker(BuildContext context) async {
    final selection = await showModalBottomSheet<EventPrivacyLevel>(
      context: context,
      builder: (context) => _SelectionSheet<EventPrivacyLevel>(
        title: 'Default Event Privacy',
        options: EventPrivacyLevel.values,
        selected: settings.defaultPrivacy,
        labelBuilder: _privacyLabel,
      ),
    );

    if (selection != null) {
      await controller.setDefaultPrivacy(selection);
    }
  }

  Future<void> _showTimeZonePicker(BuildContext context) async {
    final selection = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => _SelectionSheet<String>(
        title: 'Choose Time Zone',
        options: _timeZones,
        selected: settings.timeZone,
        labelBuilder: (zone) => zone,
      ),
    );

    if (selection != null) {
      await controller.setTimeZone(selection);
    }
  }

  static String _privacyLabel(EventPrivacyLevel level) {
    return switch (level) {
      EventPrivacyLevel.normal => 'Normal',
      EventPrivacyLevel.exclusive => 'Exclusive',
      EventPrivacyLevel.superExclusive => 'Super Exclusive',
    };
  }

  static Color _privacyColor(EventPrivacyLevel level) {
    return switch (level) {
      EventPrivacyLevel.normal => const Color(0xFF4CAF50),
      EventPrivacyLevel.exclusive => const Color(0xFFF59E0B),
      EventPrivacyLevel.superExclusive => const Color(0xFF6B7280),
    };
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
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF7C6FD6).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.person,
              color: Color(0xFF7C6FD6),
              size: 32,
            ),
          ),
          const SizedBox(width: 18),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'you@example.com',
                  style: TextStyle(
                    fontSize: 15,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          OutlinedButton(
            onPressed: onEditProfile,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF7C6FD6),
              side: const BorderSide(color: Color(0xFF7C6FD6)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: const Text(
              'Edit Profile',
              style: TextStyle(fontWeight: FontWeight.w600),
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
        borderRadius: BorderRadius.circular(28),
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

class _SettingToggleRow extends StatelessWidget {
  const _SettingToggleRow({
    required this.label,
    required this.value,
    required this.onChanged,
    this.subtitle,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
          ),
        ],
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

class _SelectionSheet<T> extends StatelessWidget {
  const _SelectionSheet({
    required this.title,
    required this.options,
    required this.selected,
    required this.labelBuilder,
  });

  final String title;
  final List<T> options;
  final T selected;
  final String Function(T option) labelBuilder;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F2C3E),
              ),
            ),
          ),
          ...options.map(
            (option) => ListTile(
              onTap: () => Navigator.of(context).pop(option),
              title: Text(
                labelBuilder(option),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2C3E),
                ),
              ),
              trailing: option == selected
                  ? const Icon(Icons.check, color: Color(0xFF7C6FD6))
                  : null,
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _SettingsError extends StatelessWidget {
  const _SettingsError({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 36, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
