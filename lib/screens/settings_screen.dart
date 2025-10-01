import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _activityDigestEnabled = true;
  bool _smartSuggestionsEnabled = false;
  bool _autoSyncEnabled = true;

  @override
  Widget build(BuildContext context) {
    final userProfile = context.watch<UserProfileProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            const _SettingsHeader(),
            Expanded(
              child: CustomScrollView(
                physics: const BouncingScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _ConnectionCard(isConnected: userProfile.googleConnected),
                        const SizedBox(height: 20),
                        _SettingsSection(
                          title: 'Notifications',
                          children: [
                            _buildSwitchTile(
                              label: 'Push notifications',
                              subtitle:
                                  'Get real-time updates about new requests and changes.',
                              value: _notificationsEnabled,
                              onChanged: (value) {
                                setState(() {
                                  _notificationsEnabled = value;
                                });
                              },
                            ),
                            _buildSwitchTile(
                              label: 'Weekly digest',
                              subtitle:
                                  'Receive a summary email every Monday morning.',
                              value: _activityDigestEnabled,
                              onChanged: (value) {
                                setState(() {
                                  _activityDigestEnabled = value;
                                });
                              },
                            ),
                            _buildSwitchTile(
                              label: 'Smart suggestions',
                              subtitle:
                                  'Surface recommended meeting times based on habits.',
                              value: _smartSuggestionsEnabled,
                              onChanged: (value) {
                                setState(() {
                                  _smartSuggestionsEnabled = value;
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _SettingsSection(
                          title: 'Calendar & sync',
                          children: [
                            _buildSwitchTile(
                              label: 'Auto sync integrations',
                              subtitle:
                                  'Keep Google Calendar events synced every 15 minutes.',
                              value: _autoSyncEnabled,
                              onChanged: (value) {
                                setState(() {
                                  _autoSyncEnabled = value;
                                });
                              },
                            ),
                            const Divider(height: 0),
                            _SettingsTile(
                              icon: Icons.calendar_month_outlined,
                              label: 'Manage calendar connections',
                              subtitle:
                                  'Connect Outlook, Apple Calendar, or upload ICS files.',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Additional integrations will be available soon.',
                                    ),
                                  ),
                                );
                              },
                            ),
                            const Divider(height: 0),
                            _SettingsTile(
                              icon: Icons.color_lens_outlined,
                              label: 'Color coding',
                              subtitle:
                                  'Customize event colors per person and event category.',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Color coding customization coming soon.'),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _SettingsSection(
                          title: 'Privacy & sharing',
                          children: const [
                            _SettingsTile(
                              icon: Icons.shield_outlined,
                              label: 'Privacy controls',
                              subtitle:
                                  'Choose what level of detail collaborators can see.',
                            ),
                            Divider(height: 0),
                            _SettingsTile(
                              icon: Icons.lock_clock_outlined,
                              label: 'Quiet hours',
                              subtitle: 'Automatically snooze notifications at night.',
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _SettingsSection(
                          title: 'Support',
                          children: [
                            _SettingsTile(
                              icon: Icons.history_rounded,
                              label: 'View change log',
                              subtitle:
                                  'See the latest improvements and releases.',
                              onTap: () {
                                Navigator.pushNamed(context, '/change-log');
                              },
                            ),
                            const Divider(height: 0),
                            _SettingsTile(
                              icon: Icons.help_center_outlined,
                              label: 'Help center',
                              subtitle:
                                  'Browse tutorials, FAQs, and troubleshooting tips.',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Help center is coming soon.'),
                                  ),
                                );
                              },
                            ),
                            const Divider(height: 0),
                            _SettingsTile(
                              icon: Icons.chat_bubble_outline,
                              label: 'Contact support',
                              subtitle:
                                  'Reach out to our team for help with anything.',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Support chat integration coming soon.'),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        const _AppVersionFooter(),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String label,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile.adaptive(
      value: value,
      onChanged: onChanged,
      activeColor: const Color(0xFF5B9FFF),
      title: Text(
        label,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.black87,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 13,
          color: Colors.black54,
        ),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    );
  }
}

class _SettingsHeader extends StatelessWidget {
  const _SettingsHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomRight,
          colors: [Color(0xFFB8E6F5), Color(0xFFE8D4F2)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            color: Colors.black87,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Settings',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Control notifications, privacy, sync, and more.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ConnectionCard extends StatelessWidget {
  const _ConnectionCard({required this.isConnected});

  final bool isConnected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF5B9FFF).withOpacity(0.12),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(
              isConnected
                  ? Icons.cloud_done_rounded
                  : Icons.cloud_off_outlined,
              color: const Color(0xFF5B9FFF),
              size: 28,
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isConnected ? 'Google Calendar connected' : 'No calendar linked',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isConnected
                      ? 'Events are syncing automatically across your devices.'
                      : 'Connect a calendar to pull in events and availability.',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    isConnected
                        ? 'Managing connections will be available soon.'
                        : 'Add calendar connections from onboarding for now.',
                  ),
                ),
              );
            },
            child: const Text('Manage'),
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: const Color(0xFF5B9FFF)),
      title: Text(
        label,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.black87,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 13,
          color: Colors.black54,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
    );
  }
}

class _AppVersionFooter extends StatelessWidget {
  const _AppVersionFooter();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        'Calendar App • Version 0.3.0-beta',
        style: TextStyle(
          fontSize: 13,
          color: Colors.black.withOpacity(0.45),
        ),
      ),
    );
  }
}
