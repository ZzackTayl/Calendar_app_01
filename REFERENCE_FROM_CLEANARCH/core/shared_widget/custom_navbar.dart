part of 'widgets.dart';

/// Custom bottom navigation bar widget.
///
/// Provides a standardized nav bar component that:
/// - Follows the app's design system
/// - Supports icons and labels
/// - Highlights current selection
/// - Works with both light and dark themes
/// - Matches client's navigation design
///
/// Usage:
/// ```dart
/// CustomNavBar(
///   currentIndex: 0,
///   onTap: (index) => handleNavigation(index),
///   onCreatePost: () => showCreateDialog(),
/// )
/// ```

class CustomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final VoidCallback? onCreatePost;

  const CustomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.onCreatePost,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (index) {
        // Handle center button separately if provided
        if (index == 2 && onCreatePost != null) {
          onCreatePost!();
        } else {
          onTap(index);
        }
      },
      type: BottomNavigationBarType.fixed,
      items: [
        BottomNavigationBarItem(
          icon: Icon(Icons.home_outlined),
          activeIcon: Icon(Icons.home),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.search_outlined),
          activeIcon: Icon(Icons.search),
          label: 'Search',
        ),
        BottomNavigationBarItem(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.add, color: Colors.white, size: 24),
          ),
          label: 'Create',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.chat_bubble_outline),
          activeIcon: Icon(Icons.chat_bubble),
          label: 'Messages',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline),
          activeIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }
}
