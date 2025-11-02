part of 'widgets.dart';

class AuthHeader extends StatelessWidget {
  final bool isSignUp;

  const AuthHeader({super.key, required this.isSignUp});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Image.asset(
          Assets.iconsLandingpageIconLogoNm,
          height: 120,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 24),
        const CustomText(
          'Welcome to MyOrbit',
          fontSize: 28,
          fontWeight: FontWeight.bold,
          textAlign: TextAlign.center,
          color: AppColors.textPrimary,
        ),
        const SizedBox(height: 12),
        CustomText(
          isSignUp
              ? 'Create an account to coordinate calendars with your connections.'
              : 'Sign in to continue coordinating schedules with ease.',
          fontSize: 15,
          color: AppColors.textSecondary,
          textAlign: TextAlign.center,
          maxLines: 2,
        ),
      ],
    );
  }
}
