part of 'widgets.dart';

class SignUpForm extends StatelessWidget {
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final bool isLoading;
  final VoidCallback onSubmit;

  const SignUpForm({
    super.key,
    required this.nameController,
    required this.emailController,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.isLoading,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CustomTextField(
          controller: nameController,
          label: 'Full name',
          textCapitalization: TextCapitalization.words,
          enabled: !isLoading,
          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
        ),
        const SizedBox(height: 16),
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
          textInputAction: TextInputAction.next,
          validator: (v) {
            if (v == null || v.isEmpty) return 'Required';
            if (v.length < 8) return 'At least 8 characters';
            return null;
          },
        ),
        const SizedBox(height: 16),
        CustomTextField(
          controller: confirmPasswordController,
          label: 'Confirm password',
          obscureText: true,
          enabled: !isLoading,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => onSubmit(),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Required';
            if (v != passwordController.text) return 'Passwords do not match';
            return null;
          },
        ),
      ],
    );
  }
}
