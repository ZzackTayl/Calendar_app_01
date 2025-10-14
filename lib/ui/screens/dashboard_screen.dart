import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import 'create_event_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final weekStart = _startOfWeek(now);
    final weekEvents = ref.watch(eventsForWeekProvider(weekStart));
    final upcomingEvents = ref.watch(upcomingEventsProvider);
    final nextEvent = upcomingEvents.isNotEmpty ? upcomingEvents.first : null;
    final pendingInvites = ref.watch(pendingInvitesProvider);
    final connectedPartners = ref.watch(connectedPartnersProvider);
    final recentActivity = DevDataService.getMockRecentActivity();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 20),
                _buildActionButtons(context),
                const SizedBox(height: 32),
                _buildGreeting(),
                const SizedBox(height: 24),
                _buildEventsCard(
                  context,
                  weekEvents.length,
                  upcomingEvents.length,
                ),
                const SizedBox(height: 16),
                _buildCalendarCard(context, nextEvent, now),
                const SizedBox(height: 16),
                _buildPeopleGroupsCard(
                  context,
                  pendingInvites.length,
                  connectedPartners.length,
                ),
                const SizedBox(height: 16),
                _buildBottomCards(context),
                const SizedBox(height: 16),
                _buildRecentActivity(context, recentActivity, now),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // MyOrbit logo
        // Screen reader: "MyOrbit logo"
        Semantics(
          label: 'MyOrbit logo',
          excludeSemantics: true,
          child: Row(
            children: [
              SemanticImage(
                label: 'MyOrbit logo',
                child: Image.asset(
                  'assets/images/myorbit_logo.png',
                  width: 50,
                  height: 50,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.public, color: Colors.blue),
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'MyOrbit',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
        // Notification bell
        // Screen reader: "Notifications, button. You have unread notifications"
        SemanticIconButton(
          label: 'Notifications',
          hint: 'You have unread notifications',
          icon: Icons.notifications,
          size: 28,
          color: AppColors.textPrimary,
          onPressed: () => context.go('/activity'),
          enabled: true,
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        // Screen reader: "Create new event, button. Opens event creation dialog"
        Expanded(
          child: SemanticButton(
            label: 'Create new event',
            hint: 'Opens event creation dialog',
            onPressed: () => _showCreateEventDialog(context),
            child: ElevatedButton.icon(
              onPressed: () => _showCreateEventDialog(context),
              icon: const Icon(Icons.add, size: 24),
              label: const Text(
                'New Event',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.cardBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Screen reader: "Add partner, button. Opens partner invitation screen"
        Expanded(
          child: SemanticButton(
            label: 'Add partner',
            hint: 'Opens partner invitation screen',
            onPressed: () => context.go('/people'),
            child: ElevatedButton.icon(
              onPressed: () => context.go('/people'),
              icon: const Icon(Icons.person_add, size: 24),
              label: const Text(
                'Add Partner',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.cardMaroon,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGreeting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Screen reader: "Good morning, heading" (emoji excluded for clarity)
        SemanticHeading(
          label: 'Good morning',
          child: const Row(
            children: [
              Text(
                'Good morning! ',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '👋',
                style: TextStyle(fontSize: 32),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Here\'s what\'s happening with your calendar',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[700],
          ),
        ),
      ],
    );
  }

  Widget _buildEventsCard(
    BuildContext context,
    int eventsThisWeek,
    int upcomingCount,
  ) {
    final weekLabel = _formatCount(
      eventsThisWeek,
      singular: 'event this week',
      plural: 'events this week',
      zeroText: 'No events this week',
    );

    final upcomingLabel = _formatCount(
      upcomingCount,
      singular: 'upcoming event',
      plural: 'upcoming events',
      zeroText: 'No upcoming events',
    );

    final weekMetricLabel = eventsThisWeek == 0
        ? 'No events this week'
        : '$eventsThisWeek ${eventsThisWeek == 1 ? 'event this week' : 'events this week'}';
    final upcomingMetricLabel = upcomingCount == 0
        ? 'Add an upcoming event'
        : '$upcomingCount ${upcomingCount == 1 ? 'upcoming event' : 'upcoming events'}';

    return SemanticCard(
      label: 'Events card',
      hint:
          '$weekLabel, $upcomingLabel. Tap to view all events and manage them.',
      isButton: true,
      onTap: () => context.go('/calendar'),
      child: GestureDetector(
        key: const Key('events_card'),
        onTap: () => context.go('/calendar'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.cardBlue,
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              DecorativeElement(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.add,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Events',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Create and manage events',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 120,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      weekMetricLabel,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.right,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      upcomingMetricLabel,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarCard(
    BuildContext context,
    CalendarEvent? nextEvent,
    DateTime now,
  ) {
    final event = nextEvent;
    final nextEventTitle = event?.title ?? 'No upcoming events yet';
    final nextEventSubtitle = event != null
        ? _formatEventDateLabel(event, now)
        : 'Add events to see them here';

    return SemanticCard(
      label: 'Calendar card',
      hint: event != null
          ? 'Next event ${event.title}, ${_formatEventDateLabel(event, now)}. Tap to view calendar.'
          : 'No events scheduled. Tap to add one.',
      isButton: true,
      onTap: () => context.go('/calendar'),
      child: GestureDetector(
        key: const Key('calendar_card'),
        onTap: () => context.go('/calendar'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.cardMaroon,
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              // Decorative icon - hidden from screen readers
              DecorativeElement(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.calendar_today,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Calendar',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventTitle,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventSubtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPeopleGroupsCard(
    BuildContext context,
    int pendingCount,
    int connectedCount,
  ) {
    final pendingLabel = _formatCount(
      pendingCount,
      singular: 'pending invite',
      plural: 'pending invites',
      zeroText: 'No pending invites',
    );

    final connectedLabel = _formatCount(
      connectedCount,
      singular: 'connected partner',
      plural: 'connected partners',
      zeroText: 'No connected partners',
    );

    return SemanticCard(
      label: 'People and Groups card',
      hint:
          '$pendingLabel, $connectedLabel. Tap to manage your connections and permissions.',
      isButton: true,
      onTap: () => context.go('/people'),
      child: GestureDetector(
        key: const Key('people_groups_card'),
        onTap: () => context.go('/people'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.cardBlue,
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              // Decorative icon - hidden from screen readers
              DecorativeElement(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.people,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'People & Groups',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Manage your connections',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '$pendingLabel • $connectedLabel',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomCards(BuildContext context) {
    return Row(
      children: [
        // Screen reader: "Settings card, button. Privacy and preferences. Tap to open settings"
        Expanded(
          child: SemanticCard(
            label: 'Settings card',
            hint: 'Privacy and preferences. Tap to open settings',
            isButton: true,
            onTap: () => context.go('/settings'),
            child: GestureDetector(
              key: const Key('settings_card'),
              onTap: () => context.go('/settings'),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.cardMaroon,
                  borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Decorative icon - hidden from screen readers
                    DecorativeElement(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.settings,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Settings',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Privacy &\npreferences',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Screen reader: "Updates and Guides card, button. Tips and tutorials. Tap to view guides"
        Expanded(
          child: SemanticCard(
            label: 'Updates and Guides card',
            hint: 'Tips and tutorials. Tap to view guides',
            isButton: true,
            onTap: () => context.go('/updates-guides'),
            child: GestureDetector(
              key: const Key('updates_guides_card'),
              onTap: () => context.go('/updates-guides'),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.cardBlue,
                  borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Decorative icon - hidden from screen readers
                    DecorativeElement(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.menu_book,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Updates &\nGuides',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tips &\ntutorials',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentActivity(
    BuildContext context,
    List<Map<String, dynamic>> activities,
    DateTime now,
  ) {
    final items = activities.take(3).toList();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.cardMaroon,
        borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Screen reader: "Recent Activity, heading"
              const SemanticHeading(
                child: Text(
                  'Recent Activity',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              // Screen reader: "View all activity, button"
              SemanticButton(
                label: 'View all activity',
                hint: 'Opens full activity list',
                onPressed: () => context.go('/activity'),
                child: const Text(
                  'View all',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (items.isEmpty)
            const Text(
              'No recent activity yet. As you start sharing events, updates will appear here.',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white,
              ),
            )
          else ...[
            for (final activity in items) ...[
              _buildActivityItem(
                title: activity['title'] as String,
                timestamp: activity['timestamp'] as DateTime,
                type: activity['type'] as NotificationType,
                now: now,
              ),
              if (activity != items.last) const SizedBox(height: 16),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildActivityItem({
    required String title,
    required DateTime timestamp,
    required NotificationType type,
    required DateTime now,
  }) {
    final dotColor = _notificationColor(type);
    final timeLabel = _formatRelativeTime(timestamp, now);

    // Screen reader: "{text}, {time}"
    // Example: "Sam accepted your calendar invite, 1 day ago"
    return SemanticListItem(
      label: title,
      hint: timeLabel,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Decorative dot - hidden from screen readers
          DecorativeElement(
            child: Container(
              margin: const EdgeInsets.only(top: 4),
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  timeLabel,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  DateTime _startOfWeek(DateTime date) {
    final difference = date.weekday % 7;
    final start = date.subtract(Duration(days: difference));
    return DateTime(start.year, start.month, start.day);
  }

  String _formatEventDateLabel(CalendarEvent event, DateTime now) {
    final start = event.start;
    final timeLabel = DateFormat.jm().format(start);

    final today = DateTime(now.year, now.month, now.day);
    final eventDay = DateTime(start.year, start.month, start.day);
    final tomorrow = today.add(const Duration(days: 1));

    if (DateUtils.isSameDay(eventDay, today)) {
      return 'Today, $timeLabel';
    }

    if (DateUtils.isSameDay(eventDay, tomorrow)) {
      return 'Tomorrow, $timeLabel';
    }

    if (eventDay.isAfter(today) &&
        eventDay.isBefore(today.add(const Duration(days: 7)))) {
      return '${DateFormat.E().format(start)}, $timeLabel';
    }

    return DateFormat('MMM d, h:mm a').format(start);
  }

  String _formatCount(
    int count, {
    required String singular,
    required String plural,
    String? zeroText,
  }) {
    if (count == 0) {
      return zeroText ?? 'No $plural';
    }
    if (count == 1) {
      return '1 $singular';
    }
    return '$count $plural';
  }

  Color _notificationColor(NotificationType type) {
    switch (type) {
      case NotificationType.eventInvite:
      case NotificationType.partnerRequest:
        return AppColors.eventPurple;
      case NotificationType.partnerAccepted:
      case NotificationType.signalShared:
        return AppColors.eventGreen;
      case NotificationType.eventReminder:
      case NotificationType.eventUpdated:
        return AppColors.eventBlue;
      case NotificationType.eventCancelled:
        return AppColors.cardMaroon;
      case NotificationType.signalReceived:
        return AppColors.cardBlue;
      case NotificationType.system:
        return Colors.white.withValues(alpha: 0.7);
    }
  }

  String _formatRelativeTime(DateTime timestamp, DateTime now) {
    final diff = now.difference(timestamp);

    if (diff.inMinutes < 1) {
      return 'Just now';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    }

    return DateFormat('MMM d').format(timestamp);
  }

  /// Show create event dialog as a modal
  void _showCreateEventDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateEventScreen(),
    );
  }
}
