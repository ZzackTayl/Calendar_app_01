import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme_constants.dart';
import '../../core/responsive_utils.dart';
import '../../domain/enums.dart';
import '../../core/timezone_service.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/providers/calendar_providers.dart';
import '../../domain/event.dart';
import '../../domain/user_calendar.dart';
import '../widgets/accessibility/semantic_text.dart';

/// Settings screen UI
///
/// Focuses on front-end composition using interactive local-only state so the
/// frontend can be exercised before the backend is ready.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsControllerProvider);
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      body: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 48, 16, 24),
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

class _SettingsContent extends ConsumerWidget {
  const _SettingsContent({
    required this.settings,
    required this.controller,
  });

  final SettingsState settings;
  final SettingsController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;
    final timeZoneAbbrev = TimezoneService.abbreviationFor(settings.timeZone);
    final timeZoneLabel = '${settings.timeZone} · $timeZoneAbbrev';
    final isDarkMode = settings.darkModeEnabled;
    final appearanceLabel = isDarkMode ? 'Night Mode' : 'Day Mode';
    final appearanceSubtitle = isDarkMode
        ? 'Switch to a lighter color palette'
        : 'Switch to a darker color palette';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: SemanticHeading(
            child: Text(
              'Settings',
              style: textStyles.heading2.copyWith(
                fontWeight: FontWeight.w800,
                color: palette.textPrimary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const _ProfileSection(
          initialName: 'You',
          initialEmail: 'you@example.com',
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Appearance',
          children: [
            _SettingToggleRow(
              label: appearanceLabel,
              subtitle: appearanceSubtitle,
              value: isDarkMode,
              onChanged: (_) => controller.toggleDarkMode(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Calendar',
          children: [
            _SimpleSettingRow(
              label: 'Default Event Privacy',
              value: _privacyLabel(settings.defaultPrivacy),
              valueColor: _privacyColor(context, settings.defaultPrivacy),
              onTap: () {
                HapticFeedback.lightImpact();
                _showPrivacyPicker(context);
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _SimpleSettingRow(
              label: 'Time Zone',
              value: timeZoneLabel,
              valueColor: palette.textPrimary,
              onTap: () {
                HapticFeedback.lightImpact();
                _showTimeZonePicker(context);
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 6),
              child: Text(
                'Visibility',
                style: textStyles.bodyLarge.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
            _SimpleSettingRow(
              label: 'Manage Calendar Visibility',
              value: 'Configure',
              valueColor: theme.colorScheme.secondary,
              labelStyle: textStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
              ),
              valueStyle: textStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.secondary,
                decoration: TextDecoration.underline,
              ),
              onTap: () {
                HapticFeedback.lightImpact();
                _showCalendarVisibilityPicker(context, ref);
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Event Activity & Notifications',
          children: [
            _SimpleSettingRow(
              label: 'Event Reminders',
              value: settings.eventRemindersEnabled
                  ? _eventReminderLabel(settings.eventReminderMinutes)
                  : 'Off',
              valueColor: settings.eventRemindersEnabled
                  ? palette.textPrimary
                  : palette.textSecondary,
              onTap: () {
                HapticFeedback.lightImpact();
                _showEventReminderPicker(context, ref);
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _SimpleSettingRow(
              label: 'Alert Delivery',
              value:
                  _eventNotificationSummary(settings.eventNotificationChannels),
              valueColor: palette.textPrimary,
              onTap: () {
                HapticFeedback.lightImpact();
                _showEventNotificationChannelPicker(context);
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Connection Updates',
          subtitle:
              'Ping me when someone accepts or declines a connection request.',
          children: [
            _SettingToggleRow(
              label: 'Connection Invitations',
              subtitle: 'Alerts when invitations are accepted or declined',
              value: settings.partnerInvitesEnabled,
              onChanged: (_) => controller.togglePartnerInvites(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'My Availability Signals',
          subtitle:
              'Controls alerts and booking buffers for the signals you share.',
          children: [
            _SimpleSettingRow(
              label: 'Send alerts via',
              value: settings.signalNotificationChannel.label,
              valueColor: palette.textPrimary,
              onTap: () {
                HapticFeedback.lightImpact();
                _showSignalChannelPicker(context);
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _SimpleSettingRow(
              label: 'Block bookings within',
              value: _signalBufferLabel(settings.signalBufferMinutes),
              valueColor: palette.textPrimary,
              onTap: () {
                HapticFeedback.lightImpact();
                _showSignalBufferPicker(context);
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Privacy & Security',
          children: [
            _ActionSettingRow(
              label: 'Data Export',
              onTap: () {
                HapticFeedback.lightImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content:
                        Text('Data export options will be available later.'),
                  ),
                );
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _ActionSettingRow(
              label: 'Delete Account',
              textColor: theme.colorScheme.error,
              onTap: () {
                HapticFeedback.mediumImpact();
                _showDeleteAccountDialog(context);
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Account & Sharing',
          children: [
            _ActionSettingRow(
              label: 'Account Recovery',
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/account-recovery');
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _ActionSettingRow(
              label: 'Share calendar access',
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/calendar-sharing');
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _ActionSettingRow(
              label: 'Import from other calendars',
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/calendar-migration');
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SettingsSection(
          title: 'Support',
          children: [
            _ActionSettingRow(
              label: 'Updates & Guides',
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/updates-guides');
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _ActionSettingRow(
              label: 'Our Discord Server',
              onTap: () {
                HapticFeedback.lightImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Discord invite link will be added soon.'),
                  ),
                );
              },
            ),
            Divider(height: 1, thickness: 1, color: palette.divider),
            _ActionSettingRow(
              label: 'Contact Support',
              onTap: () {
                HapticFeedback.lightImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Support messaging will be wired up next.'),
                  ),
                );
              },
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _showPrivacyPicker(BuildContext context) async {
    final selection = await showModalBottomSheet<EventPrivacyLevel>(
      context: context,
      builder: (context) => _PrivacySelectionSheet(
        selected: settings.defaultPrivacy,
      ),
    );

    if (selection != null) {
      await controller.setDefaultPrivacy(selection);
    }
  }

  Future<void> _showTimeZonePicker(BuildContext context) async {
    final zones = TimezoneService.displayNames;
    final selection = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => _SelectionSheet<String>(
        title: 'Choose Time Zone',
        options: zones,
        selected: settings.timeZone,
        labelBuilder: (zone) =>
            '$zone · ${TimezoneService.abbreviationFor(zone)}',
      ),
    );

    if (selection != null) {
      await controller.setTimeZone(selection);
    }
  }

  Future<void> _showEventNotificationChannelPicker(BuildContext context) async {
    final selection = await showModalBottomSheet<Set<EventNotificationChannel>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _EventAlertChannelSheet(
        initialSelection: settings.eventNotificationChannels,
      ),
    );

    if (selection != null && selection.isNotEmpty) {
      await controller.setEventNotificationChannels(selection);
    }
  }

  Future<void> _showSignalChannelPicker(BuildContext context) async {
    final selection = await showModalBottomSheet<SignalNotificationChannel>(
      context: context,
      builder: (context) => _SignalChannelSelectionSheet(
        selected: settings.signalNotificationChannel,
      ),
    );

    if (selection != null) {
      await controller.setSignalNotificationChannel(selection);
    }
  }

  Future<void> _showSignalBufferPicker(BuildContext context) async {
    final selection = await showModalBottomSheet<int>(
      context: context,
      builder: (context) => _SelectionSheet<int>(
        title: 'Signal buffer around events',
        description:
            'If someone tries to book from your signal inside this window and you already have an event, you\'ll show as unavailable.',
        options: _signalBufferOptions,
        selected: settings.signalBufferMinutes,
        labelBuilder: _signalBufferLabel,
      ),
    );

    if (selection != null) {
      await controller.setSignalBufferMinutes(selection);
    }
  }

  Future<void> _showEventReminderPicker(
      BuildContext context, WidgetRef ref) async {
    final settingsAsync = ref.read(settingsControllerProvider);
    final settings = settingsAsync.asData?.value ?? const SettingsState();
    final controller = ref.read(settingsControllerProvider.notifier);

    // Create options including "Off"
    final options = [0, ..._eventReminderOptions];

    final selection = await showModalBottomSheet<int>(
      context: context,
      builder: (context) => _SelectionSheet<int>(
        title: 'Event Reminders',
        options: options,
        selected:
            settings.eventRemindersEnabled ? settings.eventReminderMinutes : 0,
        labelBuilder: (minutes) {
          if (minutes == 0) return 'Off';
          return _eventReminderLabel(minutes);
        },
      ),
    );

    if (selection != null) {
      if (selection == 0) {
        // Turn off reminders
        await controller.toggleEventReminders();
      } else {
        // Set reminder time
        await controller.setEventReminderMinutes(selection);
        if (!settings.eventRemindersEnabled) {
          await controller.toggleEventReminders(); // Turn on if it was off
        }
      }
    }
  }

  Future<void> _showCalendarVisibilityPicker(
      BuildContext context, WidgetRef ref) async {
    // Navigate to a dedicated calendar visibility screen
    // For now, we'll show a simple dialog with the calendar visibility options
    final calendarsAsync = ref.read(calendarListProvider);
    final visibleCalendarsAsync = ref.read(visibleCalendarsProvider);

    calendarsAsync.when(
      data: (calendars) {
        final visibleIds = visibleCalendarsAsync.when(
          data: (ids) => ids,
          loading: () => <String>{},
          error: (_, __) => <String>{},
        );

        showDialog(
          context: context,
          builder: (context) => _CalendarVisibilityDialog(
            calendars: calendars,
            visibleIds: visibleIds,
            onVisibilityChanged: (calendarId, isVisible) {
              ref
                  .read(visibleCalendarsProvider.notifier)
                  .toggleCalendar(calendarId);
            },
            onToggleAll: (isVisible) {
              ref
                  .read(visibleCalendarsProvider.notifier)
                  .setAllSecondaryVisible(isVisible);
            },
          ),
        );
      },
      loading: () {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Loading calendars...')),
          );
        }
      },
      error: (_, __) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to load calendars')),
          );
        }
      },
    );
  }

  Future<void> _showDeleteAccountDialog(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        final palette = AppPalette.of(context);
        final textStyles = context.responsiveText;
        return AlertDialog(
          title: const Text('Delete account?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Deleting your account permanently removes:',
                style: textStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: palette.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              const _DialogBullet(
                  'All calendar events and shared availability.'),
              const _DialogBullet(
                  'Connected connections, permissions, and invites.'),
              const _DialogBullet(
                  'Personal settings, preferences, and history.'),
              const SizedBox(height: 16),
              Text(
                'This action cannot be undone. You will need to start fresh if you return.',
                style: textStyles.bodyMedium.copyWith(
                  color: palette.textSecondary,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                HapticFeedback.lightImpact();
                Navigator.of(context).pop(false);
              },
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
              onPressed: () {
                HapticFeedback.mediumImpact();
                Navigator.of(context).pop(true);
              },
              child: const Text('Delete account'),
            ),
          ],
        );
      },
    );

    if (!context.mounted) {
      return;
    }

    if (confirmed == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Account deletion will be completed once backend services are connected.',
          ),
        ),
      );
    }
  }

  static String _privacyLabel(EventPrivacyLevel level) {
    return switch (level) {
      EventPrivacyLevel.normal => 'Normal',
      EventPrivacyLevel.exclusive => 'Exclusive',
      EventPrivacyLevel.superExclusive => 'Super Exclusive',
    };
  }

  static const List<int> _signalBufferOptions = [0, 10, 30, 60, 120];
  static const List<int> _eventReminderOptions = [10, 30, 60, 120];

  String _signalBufferLabel(int minutes) {
    switch (minutes) {
      case 0:
        return 'No buffer';
      case 10:
        return '10 minutes';
      case 30:
        return '30 minutes';
      case 60:
        return '60 minutes';
      case 120:
        return '120 minutes';
      default:
        return '$minutes minutes';
    }
  }

  String _eventReminderLabel(int minutes) {
    switch (minutes) {
      case 10:
        return '10 mins before';
      case 30:
        return '30 mins before';
      case 60:
        return '1 hour before';
      case 120:
        return '2 hours before';
      default:
        return '$minutes mins before';
    }
  }

  String _eventNotificationSummary(Set<EventNotificationChannel> channels) {
    if (channels.isEmpty) {
      return 'No alerts';
    }

    final orderedChannels = _eventChannelDisplayOrder
        .where((channel) => channels.contains(channel));

    return orderedChannels.map((channel) => channel.label).join(', ');
  }

  static const List<EventNotificationChannel> _eventChannelDisplayOrder = [
    EventNotificationChannel.inAppOnly,
    EventNotificationChannel.push,
    EventNotificationChannel.sms,
  ];

  static Color _privacyColor(BuildContext context, EventPrivacyLevel level) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return switch (level) {
      EventPrivacyLevel.normal => colorScheme.secondary,
      EventPrivacyLevel.exclusive => colorScheme.tertiary,
      EventPrivacyLevel.superExclusive => theme.colorScheme.outline,
    };
  }
}

class _ProfileSection extends StatefulWidget {
  const _ProfileSection({
    required this.initialName,
    required this.initialEmail,
  });

  final String initialName;
  final String initialEmail;

  @override
  State<_ProfileSection> createState() => _ProfileSectionState();
}

class _ProfileSectionState extends State<_ProfileSection> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  bool _isEditing = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _emailController = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _toggleEditing() {
    setState(() {
      _isEditing = true;
    });
  }

  void _saveProfile() {
    setState(() {
      _isEditing = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
            'Profile updated. These changes will sync once backend is connected.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;
    final textTheme = theme.textTheme;
    final accent = theme.colorScheme.secondary;
    final buttonForeground =
        palette.isDark ? Colors.white : theme.colorScheme.onSecondary;
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 360;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: isNarrow
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: accent.withValues(
                          alpha: palette.isDark ? 0.24 : 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(
                      Icons.person,
                      color: accent,
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (_isEditing)
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Name',
                    ),
                  )
                else
                  Text(
                    _nameController.text,
                    style: textStyles.heading4.copyWith(
                      fontWeight: FontWeight.w700,
                      color: palette.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 6),
                if (_isEditing)
                  TextField(
                    controller: _emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                    ),
                    keyboardType: TextInputType.emailAddress,
                  )
                else
                  Text(
                    _emailController.text,
                    style: textStyles.bodyMedium.copyWith(
                      color: palette.textSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: _isEditing
                      ? FilledButton(
                          onPressed: () {
                            HapticFeedback.mediumImpact();
                            _saveProfile();
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: theme.colorScheme.secondary,
                          ),
                          child: Text(
                            'Save',
                            style: textStyles.buttonMedium.copyWith(
                              color: buttonForeground,
                            ),
                          ),
                        )
                      : ElevatedButton(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            _toggleEditing();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: accent,
                            foregroundColor: buttonForeground,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 18,
                              vertical: 10,
                            ),
                            elevation: 0,
                          ),
                          child: Text(
                            'Edit Profile',
                            style: textStyles.buttonMedium.copyWith(
                              fontWeight: FontWeight.w600,
                              color: buttonForeground,
                            ),
                          ),
                        ),
                ),
              ],
            )
          : Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color:
                        accent.withValues(alpha: palette.isDark ? 0.24 : 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    Icons.person,
                    color: accent,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_isEditing)
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Name',
                          ),
                        )
                      else
                        Text(
                          _nameController.text,
                          style: textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: palette.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      const SizedBox(height: 6),
                      if (_isEditing)
                        TextField(
                          controller: _emailController,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                          ),
                          keyboardType: TextInputType.emailAddress,
                        )
                      else
                        Text(
                          _emailController.text,
                          style: textTheme.bodyMedium?.copyWith(
                            color: palette.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                if (_isEditing)
                  FilledButton(
                    onPressed: () {
                      HapticFeedback.mediumImpact();
                      _saveProfile();
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: theme.colorScheme.secondary,
                    ),
                    child: Text(
                      'Save',
                      style: textStyles.buttonMedium.copyWith(
                        color: buttonForeground,
                      ),
                    ),
                  )
                else
                  ElevatedButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      _toggleEditing();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: buttonForeground,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 10),
                      elevation: 0,
                    ),
                    child: Text(
                      'Edit Profile',
                      style: textStyles.buttonSmall.copyWith(
                        fontWeight: FontWeight.w600,
                        color: buttonForeground,
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
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;

    return Container(
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SemanticHeading(
                  child: Text(
                    title,
                    style: textStyles.heading4.copyWith(
                      fontWeight: FontWeight.w700,
                      color: palette.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    subtitle!,
                    style: textStyles.bodyMedium.copyWith(
                      color: palette.textSecondary,
                    ),
                  ),
                ],
              ],
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
    this.labelStyle,
    this.valueStyle,
  });

  final String label;
  final String value;
  final Color valueColor;
  final VoidCallback onTap;
  final TextStyle? labelStyle;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;

    final defaultLabelStyle = textStyles.bodyMedium.copyWith(
      fontWeight: FontWeight.w600,
      color: palette.textPrimary,
    );
    final defaultValueStyle = textStyles.bodyMedium.copyWith(
      fontWeight: FontWeight.w700,
      color: valueColor,
    );
    final effectiveLabelStyle = labelStyle != null
        ? labelStyle!.copyWith(
            color: labelStyle!.color ?? palette.textPrimary,
          )
        : defaultLabelStyle;
    final effectiveValueStyle = valueStyle != null
        ? valueStyle!.copyWith(
            color: valueStyle!.color ?? valueColor,
          )
        : defaultValueStyle;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                style: effectiveLabelStyle,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                value,
                style: effectiveValueStyle,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DialogBullet extends StatelessWidget {
  const _DialogBullet(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '•',
            style: textTheme.bodyMedium?.copyWith(
              color: palette.textPrimary,
              height: 1.4,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textPrimary,
                height: 1.4,
              ),
              softWrap: true,
              overflow: TextOverflow.visible,
            ),
          ),
        ],
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
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    subtitle!,
                    style: textTheme.bodyMedium?.copyWith(
                      color: palette.textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
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
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Text(
          label,
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: textColor ?? palette.textPrimary,
          ),
          overflow: TextOverflow.ellipsis,
          maxLines: 2,
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
    this.description,
  });

  final String title;
  final List<T> options;
  final T selected;
  final String Function(T option) labelBuilder;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text(
                title,
                style: textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
            if (description != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Text(
                  description!,
                  style: textTheme.bodyMedium?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
              ),
            ...options.map(
              (option) => ListTile(
                onTap: () {
                  HapticFeedback.lightImpact();
                  Navigator.of(context).pop(option);
                },
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                visualDensity: VisualDensity.compact,
                title: Text(
                  labelBuilder(option),
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: palette.textPrimary,
                  ),
                ),
                trailing: option == selected
                    ? Icon(Icons.check,
                        color: Theme.of(context).colorScheme.secondary)
                    : null,
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _EventAlertChannelSheet extends StatefulWidget {
  const _EventAlertChannelSheet({required this.initialSelection});

  final Set<EventNotificationChannel> initialSelection;

  @override
  State<_EventAlertChannelSheet> createState() =>
      _EventAlertChannelSheetState();
}

class _EventAlertChannelSheetState extends State<_EventAlertChannelSheet> {
  late Set<EventNotificationChannel> _selection;

  @override
  void initState() {
    super.initState();
    _selection = Set<EventNotificationChannel>.from(widget.initialSelection);
    if (_selection.isEmpty) {
      _selection = {EventNotificationChannel.push};
    }
  }

  void _toggle(EventNotificationChannel channel) {
    setState(() {
      if (_selection.contains(channel)) {
        if (_selection.length == 1) {
          return;
        }
        _selection.remove(channel);
      } else {
        _selection.add(channel);
      }
    });
  }

  void _submit() {
    Navigator.of(context)
        .pop(Set<EventNotificationChannel>.unmodifiable(_selection));
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;
    final channelOrder = _SettingsContent._eventChannelDisplayOrder;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
              child: Text(
                'Choose alert types',
                style: textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
              child: Text(
                'Pick every way you want to be reminded about upcoming events.',
                style: textTheme.bodyMedium?.copyWith(
                  color: palette.textSecondary,
                ),
              ),
            ),
            ...channelOrder.map(
              (channel) {
                final selected = _selection.contains(channel);
                return CheckboxListTile(
                  value: selected,
                  onChanged: (checked) {
                    HapticFeedback.lightImpact();
                    if (checked == true) {
                      _toggle(channel);
                    } else {
                      if (_selection.length == 1) {
                        HapticFeedback.mediumImpact();
                        return;
                      }
                      _toggle(channel);
                    }
                  },
                  contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                  title: Text(
                    channel.label,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: palette.textPrimary,
                    ),
                  ),
                  controlAffinity: ListTileControlAffinity.leading,
                );
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _selection.isEmpty ? null : _submit,
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PrivacySelectionSheet extends StatelessWidget {
  const _PrivacySelectionSheet({required this.selected});

  final EventPrivacyLevel selected;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text(
                'Default Event Privacy',
                style: textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
            ...EventPrivacyLevel.values.map(
              (level) => _PrivacyOption(
                level: level,
                isSelected: level == selected,
                onTap: () {
                  HapticFeedback.lightImpact();
                  Navigator.of(context).pop(level);
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _PrivacyOption extends StatelessWidget {
  const _PrivacyOption({
    required this.level,
    required this.isSelected,
    required this.onTap,
  });

  final EventPrivacyLevel level;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    final label = _getPrivacyLabel(level);
    final description = _getPrivacyDescription(level);
    final color = _getPrivacyColor(context, level);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? color : palette.divider,
                width: isSelected ? 2 : 1,
              ),
              color: isSelected
                  ? color.withValues(alpha: 0.1)
                  : Colors.transparent,
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: palette.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        description,
                        style: textTheme.bodySmall?.copyWith(
                          color: palette.textSecondary,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                if (isSelected)
                  Icon(
                    Icons.check_circle,
                    color: color,
                    size: 24,
                  )
                else
                  Icon(
                    Icons.circle_outlined,
                    color: palette.textSecondary,
                    size: 24,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SettingsError extends StatelessWidget {
  const _SettingsError({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 36, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(
              error,
              textAlign: TextAlign.center,
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CalendarVisibilityDialog extends StatefulWidget {
  const _CalendarVisibilityDialog({
    required this.calendars,
    required this.visibleIds,
    required this.onVisibilityChanged,
    required this.onToggleAll,
  });

  final List<UserCalendar> calendars;
  final Set<String> visibleIds;
  final void Function(String calendarId, bool isVisible) onVisibilityChanged;
  final void Function(bool isVisible) onToggleAll;

  @override
  State<_CalendarVisibilityDialog> createState() =>
      _CalendarVisibilityDialogState();
}

class _CalendarVisibilityDialogState extends State<_CalendarVisibilityDialog> {
  late Set<String> _localVisibleIds;

  @override
  void initState() {
    super.initState();
    _localVisibleIds = Set.from(widget.visibleIds);
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;
    final secondaryCalendars =
        widget.calendars.where((c) => !c.isPrimary).toList();
    final allSecondaryVisible = secondaryCalendars.isNotEmpty &&
        secondaryCalendars.every((c) => _localVisibleIds.contains(c.id));

    return AlertDialog(
      title: const Text("Calendar Visibility"),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Choose which calendars to display in your calendar view.",
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textSecondary,
              ),
              softWrap: true,
              overflow: TextOverflow.visible,
            ),
            const SizedBox(height: 16),
            if (secondaryCalendars.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Secondary Calendars",
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      setState(() {
                        if (allSecondaryVisible) {
                          _localVisibleIds.removeWhere((id) =>
                              secondaryCalendars.any((c) => c.id == id));
                        } else {
                          _localVisibleIds
                              .addAll(secondaryCalendars.map((c) => c.id));
                        }
                      });
                    },
                    child: Text(
                      allSecondaryVisible ? "Turn all off" : "Turn all on",
                      style: textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...secondaryCalendars
                  .map((calendar) => _buildCalendarToggle(calendar)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            HapticFeedback.lightImpact();
            Navigator.of(context).pop();
          },
          child: const Text("Cancel"),
        ),
        FilledButton(
          onPressed: () {
            HapticFeedback.mediumImpact();
            for (final calendar in secondaryCalendars) {
              final shouldBeVisible = _localVisibleIds.contains(calendar.id);
              final isCurrentlyVisible =
                  widget.visibleIds.contains(calendar.id);
              if (shouldBeVisible != isCurrentlyVisible) {
                widget.onVisibilityChanged(calendar.id, shouldBeVisible);
              }
            }
            Navigator.of(context).pop();
          },
          child: const Text("Apply"),
        ),
      ],
      scrollable: true,
    );
  }

  Widget _buildCalendarToggle(UserCalendar calendar) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;
    final isVisible = _localVisibleIds.contains(calendar.id);
    final color = Color(calendar.colorValue);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              calendar.name,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
                color: isVisible ? palette.textPrimary : palette.textSecondary,
              ),
              softWrap: true,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Switch(
            value: isVisible,
            onChanged: (value) {
              HapticFeedback.lightImpact();
              setState(() {
                if (value) {
                  _localVisibleIds.add(calendar.id);
                } else {
                  _localVisibleIds.remove(calendar.id);
                }
              });
            },
          ),
        ],
      ),
    );
  }
}

class _SignalChannelSelectionSheet extends StatelessWidget {
  const _SignalChannelSelectionSheet({required this.selected});

  final SignalNotificationChannel selected;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text(
                'Signal alert channel',
                style: textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
            ...SignalNotificationChannel.values.map(
              (channel) => _SignalChannelOption(
                channel: channel,
                isSelected: channel == selected,
                onTap: () {
                  HapticFeedback.lightImpact();
                  Navigator.of(context).pop(channel);
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _SignalChannelOption extends StatelessWidget {
  const _SignalChannelOption({
    required this.channel,
    required this.isSelected,
    required this.onTap,
  });

  final SignalNotificationChannel channel;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    final label = channel.label;
    final description = _getSignalChannelDescription(channel);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? Theme.of(context).colorScheme.secondary
                    : palette.divider,
                width: isSelected ? 2 : 1,
              ),
              color: isSelected
                  ? Theme.of(context)
                      .colorScheme
                      .secondary
                      .withValues(alpha: 0.1)
                  : Colors.transparent,
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: palette.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        description,
                        style: textTheme.bodySmall?.copyWith(
                          color: palette.textSecondary,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                if (isSelected)
                  Icon(
                    Icons.check_circle,
                    color: Theme.of(context).colorScheme.secondary,
                    size: 24,
                  )
                else
                  Icon(
                    Icons.circle_outlined,
                    color: palette.textSecondary,
                    size: 24,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Module-level helper functions for privacy level display
String _getSignalChannelDescription(SignalNotificationChannel channel) {
  return switch (channel) {
    SignalNotificationChannel.push =>
      'Get push notifications to your device for signal updates',
    SignalNotificationChannel.inAppOnly =>
      'Only get updates in the notification center',
    SignalNotificationChannel.sms =>
      'Receive text notifications via SMS for signal updates',
  };
}

String _getPrivacyLabel(EventPrivacyLevel level) {
  return switch (level) {
    EventPrivacyLevel.normal => 'Normal',
    EventPrivacyLevel.exclusive => 'Exclusive',
    EventPrivacyLevel.superExclusive => 'Super Exclusive',
  };
}

String _getPrivacyDescription(EventPrivacyLevel level) {
  return switch (level) {
    EventPrivacyLevel.normal => 'Visible to all invited guests',
    EventPrivacyLevel.exclusive => 'Only invited guests can see this event',
    EventPrivacyLevel.superExclusive =>
      'Hidden from most contacts, deeply private',
  };
}

Color _getPrivacyColor(BuildContext context, EventPrivacyLevel level) {
  final colorScheme = Theme.of(context).colorScheme;
  return switch (level) {
    EventPrivacyLevel.normal => colorScheme.secondary,
    EventPrivacyLevel.exclusive => colorScheme.tertiary,
    EventPrivacyLevel.superExclusive => const Color(0xFFEF4444),
  };
}
