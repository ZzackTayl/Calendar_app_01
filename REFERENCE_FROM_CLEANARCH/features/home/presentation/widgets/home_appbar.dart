part of 'widgets.dart';

/// App bar for the home screen with logo and notifications
class HomeAppBar extends StatelessWidget {
  const HomeAppBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Image.asset(Assets.iconsLandingpageIconLogoNm, height: 100),
          const NotificationButton(),
        ],
      ),
    );
  }
}
