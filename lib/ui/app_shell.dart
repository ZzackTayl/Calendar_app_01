import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme_constants.dart';
import '../logic/providers/ui_state_providers.dart';
import '../logic/providers/reminder_providers.dart';
import '../logic/providers/connection_notification_watchers.dart';
import '../logic/providers/calendar_change_notification_watchers.dart';

/// Main app shell with bottom navigation bar
///
/// This widget provides the persistent bottom navigation that appears
/// across all main screens of the app. Now integrated with GoRouter for
/// proper nested navigation and deep linking support.
class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Initialize and watch reminders (reschedules on event/setting changes)
    ref.watch(reminderWatcherProvider);

    // Watch for connection invitation status changes
    ref.watch(contactChangeNotificationProvider);

    // Watch for calendar changes
    ref.watch(eventChangeNotificationProvider);

    // Get theme
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final activityIconColor =
        palette.isDark ? const Color(0xFF9CCAFF) : const Color(0xFF1D4ED8);

    // Sync current tab with route location (handle test context gracefully)
    int currentTab = 0;
    try {
      final location = GoRouterState.of(context).uri.path;
      currentTab = _getTabIndexFromLocation(location);
    } catch (e) {
      // In test context, GoRouterState may not be available
      // Default to tab 0 (Dashboard)
      currentTab = 0;
    }

    // Update provider if needed
    if (ref.read(currentTabProvider) != currentTab) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(currentTabProvider.notifier).setTab(currentTab);
      });
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: palette.cardShadow,
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: currentTab,
          onDestinationSelected: (index) => _onItemTapped(context, ref, index),
          backgroundColor: theme.colorScheme.surface,
          indicatorColor: theme.colorScheme.primary.withValues(alpha: 0.2),
          height: 70,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            Semantics(
              label: 'Home tab, 1 of 4',
              child: NavigationDestination(
                key: const Key('nav_home'),
                icon: const Icon(Icons.home_outlined),
                selectedIcon: const Icon(Icons.home),
                label: 'Home',
              ),
            ),
            Semantics(
              label: 'Calendar tab, 2 of 4',
              child: NavigationDestination(
                key: const Key('nav_calendar'),
                icon: const Icon(Icons.calendar_month_outlined),
                selectedIcon: const Icon(Icons.calendar_month),
                label: 'Calendar',
              ),
            ),
            Semantics(
              label: 'Activity tab, 3 of 4',
              child: NavigationDestination(
                key: const Key('nav_activity'),
                icon: Icon(Icons.notifications_outlined, color: activityIconColor),
                selectedIcon: Icon(Icons.notifications, color: activityIconColor),
                label: 'Activity',
              ),
            ),
            Semantics(
              label: 'People tab, 4 of 4',
              child: NavigationDestination(
                key: const Key('nav_people'),
                icon: const Icon(Icons.people_outlined),
                selectedIcon: const Icon(Icons.people),
                label: 'People',
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Handle navigation item tap - uses GoRouter for navigation
  void _onItemTapped(BuildContext context, WidgetRef ref, int index) {
    // Update current tab provider
    ref.read(currentTabProvider.notifier).setTab(index);

    // Navigate using GoRouter (handle test context gracefully)
    try {
      switch (index) {
        case 0:
          context.go('/dashboard');
          break;
        case 1:
          context.go('/calendar');
          break;
        case 2:
          context.go('/activity');
          break;
        case 3:
          context.go('/people');
          break;
      }
    } catch (e) {
      // In test context, GoRouter may not be available
      // Tab switching still updates the provider state for testing
    }
  }

  /// Get tab index from current route location
  static int _getTabIndexFromLocation(String location) {
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/calendar')) return 1;
    if (location.startsWith('/activity')) return 2;
    if (location.startsWith('/people')) return 3;
    return 0; // Default to dashboard
  }
}
