part of 'widgets.dart';

class SignInForm extends StatelessWidget {
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool isLoading;
  final VoidCallback onSubmit;

  const SignInForm({
    super.key,
    required this.emailController,
    required this.passwordController,
    required this.isLoading,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CustomTextField(
          controller: emailController,
          label: 'Email address',
          keyboardType: TextInputType.emailAddress,
          enabled: !isLoading,
          validator: (v) {
            if (v == null || v.isEmpty) return 'Required';
            if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) {
              return 'Enter a valid email';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        CustomTextField(
          controller: passwordController,
          label: 'Password',
          obscureText: true,
          enabled: !isLoading,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => onSubmit(),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Required';
            if (v.length < 8) return 'At least 8 characters';
            return null;
          },
        ),
      ],
    );
  }
}
