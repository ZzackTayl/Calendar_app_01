part of 'widgets.dart';

/// Notification button with badge count
class NotificationButton extends StatelessWidget {
  const NotificationButton({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HomeCubit, HomeState>(
      builder: (context, state) {
        final notificationCount = state is HomeLoaded
            ? state.data.notificationCount
            : 0;

        return Stack(
          children: [
            IconButton(
              icon: Image.asset(
                Assets.iconsNotificationIconWood,
                width: 35,
                height: 35,
              ),
              onPressed: () {
                // Navigate to notifications
              },
            ),
            if (notificationCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: NotificationBadge(count: notificationCount),
              ),
          ],
        );
      },
    );
  }
}
