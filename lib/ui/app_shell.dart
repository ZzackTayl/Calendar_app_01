import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme_constants.dart';
import '../logic/providers/ui_state_providers.dart';
import '../logic/providers/notification_providers.dart';
import '../logic/providers/reminder_providers.dart';
import '../logic/providers/reminder_banner_providers.dart';
import '../logic/providers/connection_notification_watchers.dart';
import '../logic/providers/calendar_change_notification_watchers.dart';
import 'widgets/event_reminder_banner.dart';

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

    // Watch banner notifications
    final bannerNotifications =
        ref.watch(groupedReminderBannerNotificationsProvider);

    final hasBanner = bannerNotifications.isNotEmpty;
    const bannerHeight = 68.0;
    const bannerSpacing = 12.0;
    final reservedTopSpace = hasBanner ? bannerHeight + bannerSpacing : 0.0;

    final backgroundDecoration = palette.isDark
        ? const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1A1C24), Color(0xFF252837)],
            ),
          )
        : BoxDecoration(color: palette.background);

    return Semantics(
      label: 'MyOrbit main layout',
      container: true,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: backgroundDecoration,
            ),
          ),
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.only(top: reservedTopSpace),
              child: child,
            ),
          ),
          if (hasBanner)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: EventReminderBanner(
                    notifications: bannerNotifications,
                    onDismiss: () {
                      final notifier =
                          ref.read(notificationListProvider.notifier);
                      for (final notification in bannerNotifications) {
                        notifier.dismissNotification(notification.id);
                      }
                    },
                  ),
                ),
              ),
            ),
        ],
      ),
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
          child: Semantics(
            label: 'Bottom navigation bar',
            container: true,
            child: NavigationBar(
            selectedIndex: currentTab,
            onDestinationSelected: (index) =>
                _onItemTapped(context, ref, index),
            backgroundColor: theme.colorScheme.surface,
            indicatorColor:
                theme.colorScheme.primary.withValues(alpha: 0.2),
            height: 70,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
            Semantics(
              label: 'Home tab, 1 of 4',
              explicitChildNodes: true,
              child: NavigationDestination(
                  key: const Key('nav_home'),
                  icon: const Icon(Icons.home_outlined),
                  selectedIcon: const Icon(Icons.home),
                  label: 'Home',
                ),
              ),
            Semantics(
              label: 'Calendar tab, 2 of 4',
              explicitChildNodes: true,
              child: NavigationDestination(
                  key: const Key('nav_calendar'),
                  icon: const Icon(Icons.calendar_month_outlined),
                  selectedIcon: const Icon(Icons.calendar_month),
                  label: 'Calendar',
                ),
              ),
            Semantics(
              label: 'Activity tab, 3 of 4',
              explicitChildNodes: true,
              child: NavigationDestination(
                  key: const Key('nav_activity'),
                  icon: const Icon(Icons.feed_outlined),
                  selectedIcon: const Icon(Icons.feed),
                  label: 'Activity',
                ),
              ),
            Semantics(
              label: 'My Orbit tab, 4 of 4',
              explicitChildNodes: true,
              child: NavigationDestination(
                  key: const Key('nav_people'),
                  icon: const Icon(Icons.people_outlined),
                  selectedIcon: const Icon(Icons.people),
                  label: 'My Orbit',
                ),
              ),
            ],
          ),
          ),
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
