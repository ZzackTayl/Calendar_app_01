part of 'widgets.dart';

class AuthModeToggle extends StatelessWidget {
  final bool isSignUp;

  const AuthModeToggle({super.key, required this.isSignUp});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.toggleBackground,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: ModeOption(
              label: 'Sign in',
              selected: !isSignUp,
              onTap: () => context.read<AuthCubit>().setSignInMode(),
            ),
          ),
          Expanded(
            child: ModeOption(
              label: 'Sign up',
              selected: isSignUp,
              onTap: () => context.read<AuthCubit>().setSignUpMode(),
            ),
          ),
        ],
      ),
    );
  }
}
