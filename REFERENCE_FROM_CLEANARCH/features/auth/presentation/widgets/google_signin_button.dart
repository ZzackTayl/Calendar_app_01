part of 'widgets.dart';

class GoogleSignInButton extends StatelessWidget {
  final bool isLoading;

  const GoogleSignInButton({super.key, required this.isLoading});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading
          ? null
          : () => context.read<AuthCubit>().signInWithGoogle(),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.arrow_forward, color: AppColors.primary, size: 20),
          SizedBox(width: 8),
          Text(
            'Continue with Google',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
