import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme_constants.dart';
import '../logic/services/dev_data_service.dart';
import '../logic/providers/ui_state_providers.dart';

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
    // Get unread notification count for badge
    final unreadCount = DevDataService.getMockUnreadActivity().length;

    // Sync current tab with route location
    final location = GoRouterState.of(context).uri.path;
    final currentTab = _getTabIndexFromLocation(location);

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
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: currentTab,
          onDestinationSelected: (index) => _onItemTapped(context, ref, index),
          backgroundColor: AppColors.backgroundWhite,
          indicatorColor: AppColors.cardBlue.withValues(alpha: 0.2),
          height: 70,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            NavigationDestination(
              key: const Key('nav_home'),
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              key: const Key('nav_calendar'),
              icon: const Icon(Icons.calendar_month_outlined),
              selectedIcon: const Icon(Icons.calendar_month),
              label: 'Calendar',
            ),
            NavigationDestination(
              key: const Key('nav_activity'),
              icon: Badge(
                isLabelVisible: unreadCount > 0,
                label: Text('$unreadCount'),
                child: const Icon(Icons.notifications_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: unreadCount > 0,
                label: Text('$unreadCount'),
                child: const Icon(Icons.notifications),
              ),
              label: 'Activity',
            ),
            NavigationDestination(
              key: const Key('nav_people'),
              icon: const Icon(Icons.people_outlined),
              selectedIcon: const Icon(Icons.people),
              label: 'People',
            ),
            NavigationDestination(
              key: const Key('nav_settings'),
              icon: const Icon(Icons.settings_outlined),
              selectedIcon: const Icon(Icons.settings),
              label: 'Settings',
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

    // Navigate using GoRouter
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
      case 4:
        context.go('/settings');
        break;
    }
  }

  /// Get tab index from current route location
  static int _getTabIndexFromLocation(String location) {
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/calendar')) return 1;
    if (location.startsWith('/activity')) return 2;
    if (location.startsWith('/people')) return 3;
    if (location.startsWith('/settings')) return 4;
    return 0; // Default to dashboard
  }
}
