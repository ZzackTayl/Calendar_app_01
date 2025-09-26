import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/event_provider.dart';
import '../providers/user_provider.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  static const _backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFE9F5FF), Color(0xFFF9E8FF)],
  );

  static const _highlightGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2B7BFF), Color(0xFF265DFF)],
  );

  @override
  Widget build(BuildContext context) {
    final eventProvider = context.watch<EventProvider>();
    final userProfile = context.watch<UserProfileProvider>();

    final upcomingEvents = [...eventProvider.events]
      ..sort((a, b) => a.date.compareTo(b.date));
    final now = DateTime.now();
    CalendarEvent? nextEvent;
    if (upcomingEvents.isNotEmpty) {
      final today = DateTime(now.year, now.month, now.day);
      final futureEvents = upcomingEvents.where((event) {
        final eventDay = DateTime(event.date.year, event.date.month, event.date.day);
        return !eventDay.isBefore(today);
      }).toList();

      if (futureEvents.isNotEmpty) {
        nextEvent = futureEvents.first;
      } else if (upcomingEvents.isNotEmpty) {
        nextEvent = upcomingEvents.first;
      }
    }

    final eventsThisWeek = eventProvider.events.where((event) {
      final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
      final endOfWeek = startOfWeek.add(const Duration(days: 6));
      return !event.date.isBefore(startOfWeek) && !event.date.isAfter(endOfWeek);
    }).length;

    final upcomingCount = eventProvider.events.where((event) {
      final eventDay = DateTime(event.date.year, event.date.month, event.date.day);
      final today = DateTime(now.year, now.month, now.day);
      return !eventDay.isBefore(today);
    }).length;

    final connectedPartners = userProfile.connectedPartnersCount;
    final pendingInvites = userProfile.pendingInviteCount;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: _backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Text(
                    'Dashboard',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Colors.black.withOpacity(0.78),
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Good morning! 👋',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F1F39),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Here's what's happening with your calendar",
                  style: TextStyle(
                    fontSize: 16,
                    color: const Color(0xFF5B5A78).withOpacity(0.9),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 28),
                Row(
                  children: [
                    Expanded(
                      child: _SummaryStatCard(
                        icon: Icons.calendar_today_rounded,
                        iconColor: const Color(0xFF4A88FF),
                        title: '$upcomingCount',
                        subtitle: 'Upcoming Events',
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _SummaryStatCard(
                        icon: Icons.groups_rounded,
                        iconColor: const Color(0xFF9C5BFF),
                        title: '$connectedPartners',
                        subtitle: 'Connected Partners',
                        trailingHint: pendingInvites > 0
                            ? '$pendingInvites pending invites'
                            : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _HighlightCard(
                  nextEventTitle: nextEvent?.title ?? 'Set up your first event',
                  nextEventTime: nextEvent != null
                      ? _formatEventTime(nextEvent)
                      : 'No events scheduled yet',
                  onTap: () {
                    Navigator.pushNamed(context, '/calendar');
                  },
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.add_circle_outline,
                        iconColor: const Color(0xFF41C27B),
                        title: 'Events',
                        description: 'Create and manage events',
                        detail: eventsThisWeek > 0
                            ? '$eventsThisWeek this week'
                            : 'No events this week yet',
                        onTap: () {
                          Navigator.pushNamed(context, '/calendar');
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.person_add_alt_1_rounded,
                        iconColor: const Color(0xFF9C5BFF),
                        title: 'People & Groups',
                        description: 'Manage your connections',
                        detail: pendingInvites > 0
                            ? '$pendingInvites pending invites'
                            : 'No pending invites',
                        onTap: () {
                          // Placeholder for future navigation
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'People & Groups coming soon – frontend ready.',
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _ActionCard(
                  icon: Icons.settings_outlined,
                  iconColor: const Color(0xFF7B8994),
                  title: 'Settings',
                  description: 'Privacy, notifications, and preferences',
                  detail: userProfile.googleConnected
                      ? 'Google Calendar connected'
                      : 'Connect integrations',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Settings screen to be implemented.'),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _formatEventTime(CalendarEvent event) {
  final dateLabel = DateFormat('EEEE, MMM d').format(event.date);
  final timeLabel = event.time != null && event.time!.isNotEmpty
      ? event.time
      : DateFormat('h:mm a').format(event.date);
  return '$dateLabel • $timeLabel';
}

class _SummaryStatCard extends StatelessWidget {
  const _SummaryStatCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.trailingHint,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String? trailingHint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x112D4B7B),
            blurRadius: 28,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(height: 20),
          Text(
            title,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1F1F39),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 14,
              color: const Color(0xFF5B5A78).withOpacity(0.9),
            ),
          ),
          if (trailingHint != null) ...[
            const SizedBox(height: 12),
            Text(
              trailingHint!,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF9C5BFF),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({
    required this.nextEventTitle,
    required this.nextEventTime,
    required this.onTap,
  });

  final String nextEventTitle;
  final String nextEventTime;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        decoration: BoxDecoration(
          gradient: DashboardScreen._highlightGradient,
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33265DFF),
              blurRadius: 40,
              offset: Offset(0, 24),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.calendar_month_outlined, color: Colors.white, size: 26),
                SizedBox(width: 12),
                Text(
                  'Calendar',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              nextEventTitle,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              nextEventTime,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withOpacity(0.9),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.description,
    required this.detail,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String description;
  final String detail;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x112D4B7B),
              blurRadius: 28,
              offset: Offset(0, 18),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F1F39),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: TextStyle(
                fontSize: 14,
                color: const Color(0xFF5B5A78).withOpacity(0.9),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              detail,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF265DFF),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
