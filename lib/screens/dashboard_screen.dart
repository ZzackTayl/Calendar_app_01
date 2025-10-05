import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userProfile = context.watch<UserProfileProvider>();
    final connectedPartners = userProfile.connectedPartnersCount;
    final pendingInvites = userProfile.pendingInviteCount;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.topRight,
            colors: [Color(0xFFB8E6F5), Color(0xFFE8D4F2)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Extended Header
              Container(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  children: [
                    // Top bar with bell icon
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Spacer(),
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: Image.asset(
                              'icons/wooden_bell.png',
                              width: 28,
                              height: 28,
                              errorBuilder: (context, error, stackTrace) {
                                return const Icon(
                                  Icons.notifications_outlined,
                                  color: Colors.black87,
                                  size: 28,
                                );
                              },
                            ),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Notifications coming soon'),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Greeting section
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Good morning! ',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w700,
                                color: Colors.black87,
                              ),
                            ),
                            const Text(
                              '👋',
                              style: TextStyle(fontSize: 32),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Here\'s what\'s happening with your calendar',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.black54,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),

              // Content
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(30),
                      topRight: Radius.circular(30),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Events Card
                        _buildColoredCard(
                          icon: Icons.add_circle_outline,
                          backgroundColor: const Color(0xFF5B9FFF),
                          title: 'Events',
                          subtitle: 'Create and manage events',
                          rightInfo: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                '4 this week',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                              const Text(
                                '5 upcoming',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.pushNamed(context, '/events');
                          },
                        ),

                        const SizedBox(height: 16),

                        // Calendar Card
                        _buildColoredCard(
                          icon: Icons.calendar_today_outlined,
                          backgroundColor: const Color(0xFF8B6C47),
                          title: 'Calendar',
                          subtitle: 'View and manage your schedule',
                          rightInfo: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'Next: Coffee with Sam',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'Today, ${_getCurrentTime()}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.pushNamed(context, '/calendar');
                          },
                        ),

                        const SizedBox(height: 16),

                        // People & Groups Card
                        _buildColoredCard(
                          icon: Icons.people_outline,
                          backgroundColor: const Color(0xFF5B9FFF),
                          title: 'People & Groups',
                          subtitle: 'Manage your connections',
                          rightInfo: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '$pendingInvites pending invites',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                '$connectedPartners connected partners',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.pushNamed(context, '/people-groups');
                          },
                        ),

                        const SizedBox(height: 16),

                        // Settings Card
                        _buildColoredCard(
                          icon: Icons.settings_outlined,
                          backgroundColor: const Color(0xFF8B6C47),
                          title: 'Settings',
                          subtitle: 'Privacy, notifications, and preferences',
                          onTap: () {
                            Navigator.pushNamed(context, '/settings');
                          },
                        ),

                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildColoredCard({
    required IconData icon,
    required Color backgroundColor,
    required String title,
    required String subtitle,
    Widget? rightInfo,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            if (rightInfo != null) ...[
              const SizedBox(width: 16),
              rightInfo,
            ],
          ],
        ),
      ),
    );
  }

  String _getCurrentTime() {
    final now = DateTime.now();
    final hour =
        now.hour > 12 ? now.hour - 12 : (now.hour == 0 ? 12 : now.hour);
    final minute = now.minute.toString().padLeft(2, '0');
    final period = now.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }
}
