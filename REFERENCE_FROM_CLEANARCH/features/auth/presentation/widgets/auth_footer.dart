part of 'widgets.dart';

class AuthFooter extends StatelessWidget {
  final bool isSignUp;

  const AuthFooter({super.key, required this.isSignUp});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          isSignUp ? 'Already have an account?' : 'New to MyOrbit?',
          style: TextStyle(color: Color(0xFF1F2937), fontSize: 15),
        ),
        const SizedBox(height: 4),
        GestureDetector(
          onTap: () {
            if (isSignUp) {
              context.read<AuthCubit>().setSignInMode();
            } else {
              context.read<AuthCubit>().setSignUpMode();
            }
          },
          child: Text(
            isSignUp ? 'Sign in instead' : 'Create an account',
            style: TextStyle(
              color: Color(0xFF4D8CFF),
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
