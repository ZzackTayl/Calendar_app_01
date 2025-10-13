import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme_constants.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                _buildEventsCard(context),
                const SizedBox(height: 16),
                _buildCalendarCard(context),
                const SizedBox(height: 16),
                _buildPeopleGroupsCard(context),
                const SizedBox(height: 16),
                _buildBottomCards(context),
                const SizedBox(height: 16),
                _buildRecentActivity(context),
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
            onPressed: () => context.go('/calendar'),
            child: ElevatedButton.icon(
              onPressed: () => context.go('/calendar'),
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

  Widget _buildEventsCard(BuildContext context) {
    // Screen reader: "Events card, button. 4 events this week, 5 upcoming events. Tap to view all events"
    return SemanticCard(
      label: 'Events card',
      hint: '4 events this week, 5 upcoming events. Tap to view all events',
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
              // Decorative icon - hidden from screen readers
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '4 this week',
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '5 upcoming',
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarCard(BuildContext context) {
    // Screen reader: "Calendar card, button. Next event: Coffee with Sam, Today at 10:00 AM. Tap to view calendar"
    return SemanticCard(
      label: 'Calendar card',
      hint:
          'Next event: Coffee with Sam, Today at 10:00 AM. Tap to view calendar',
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
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Calendar',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'View and manage your schedule',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Next: Coffee',
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'with Sam',
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Today, 10:00 AM',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPeopleGroupsCard(BuildContext context) {
    // Screen reader: "People and Groups card, button. 2 pending invites, 3 connected partners. Tap to manage connections"
    return SemanticCard(
      label: 'People and Groups card',
      hint:
          '2 pending invites, 3 connected partners. Tap to manage connections',
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
                      '2 pending invites • 3 connected partners',
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
            onTap: () {
              // Navigate to guides
            },
            child: GestureDetector(
              key: const Key('updates_guides_card'),
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

  Widget _buildRecentActivity(BuildContext context) {
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
          // Screen reader: "Date night with Alex tomorrow, 2 hours ago"
          _buildActivityItem(
            'Date night with Alex tomorrow',
            '2h ago',
            AppColors.eventBlue,
          ),
          const SizedBox(height: 16),
          // Screen reader: "Sam accepted your calendar invite, 1 day ago"
          _buildActivityItem(
            'Sam accepted your calendar invite',
            '1d ago',
            AppColors.eventGreen,
          ),
          const SizedBox(height: 16),
          // Screen reader: "Board game night this weekend, 2 days ago"
          _buildActivityItem(
            'Board game night this weekend',
            '2d ago',
            AppColors.eventBlue,
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(String text, String time, Color dotColor) {
    // Screen reader: "{text}, {time}"
    // Example: "Sam accepted your calendar invite, 1 day ago"
    return SemanticListItem(
      label: text,
      hint: time,
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
                  text,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  time,
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
}
