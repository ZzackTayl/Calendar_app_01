import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme_constants.dart';
import '../widgets/accessibility/semantic_button.dart';

/// Entry point screen prompting users to sign in or create an account.
///
/// This screen provides the UI scaffolding needed for future authentication
/// wiring while keeping the design consistent with the MyOrbit system.
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _signInFormKey = GlobalKey<FormState>();
  final _signUpFormKey = GlobalKey<FormState>();

  late final TextEditingController _signInEmailController;
  late final TextEditingController _signInPasswordController;

  late final TextEditingController _signUpNameController;
  late final TextEditingController _signUpEmailController;
  late final TextEditingController _signUpPasswordController;
  late final TextEditingController _signUpConfirmPasswordController;

  bool _showSignUp = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _signInEmailController = TextEditingController();
    _signInPasswordController = TextEditingController();

    _signUpNameController = TextEditingController();
    _signUpEmailController = TextEditingController();
    _signUpPasswordController = TextEditingController();
    _signUpConfirmPasswordController = TextEditingController();
  }

  @override
  void dispose() {
    _signInEmailController.dispose();
    _signInPasswordController.dispose();
    _signUpNameController.dispose();
    _signUpEmailController.dispose();
    _signUpPasswordController.dispose();
    _signUpConfirmPasswordController.dispose();
    super.dispose();
  }

  void _toggleMode(bool signUp) {
    if (_showSignUp == signUp) return;
    setState(() {
      _showSignUp = signUp;
    });
  }

  Future<void> _handleSubmit() async {
    final formKey = _showSignUp ? _signUpFormKey : _signInFormKey;
    if (!formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    // TODO: integrate backend authentication here.
    await Future.delayed(const Duration(milliseconds: 750));

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
    });

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            _showSignUp
                ? 'Sign up tapped — connect this button to your backend.'
                : 'Sign in tapped — connect this button to your backend.',
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.9),
                    borderRadius:
                        BorderRadius.circular(AppBorderRadius.xxLarge),
                    boxShadow: AppShadows.card,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 28, vertical: 36),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Image.asset(
                          'icons/landingpage_icon_logo.webp',
                          height: 92,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'Welcome to MyOrbit',
                          style: textTheme.headlineSmall?.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _showSignUp
                              ? 'Create an account to coordinate calendars with your connections.'
                              : 'Sign in to continue coordinating schedules with ease.',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 28),
                        _AuthModeToggle(
                          isSignUp: _showSignUp,
                          onChanged: _toggleMode,
                        ),
                        const SizedBox(height: 28),
                        AnimatedCrossFade(
                          duration: const Duration(milliseconds: 250),
                          crossFadeState: _showSignUp
                              ? CrossFadeState.showSecond
                              : CrossFadeState.showFirst,
                          firstChild: _SignInForm(
                            formKey: _signInFormKey,
                            emailController: _signInEmailController,
                            passwordController: _signInPasswordController,
                          ),
                          secondChild: _SignUpForm(
                            formKey: _signUpFormKey,
                            nameController: _signUpNameController,
                            emailController: _signUpEmailController,
                            passwordController: _signUpPasswordController,
                            confirmPasswordController:
                                _signUpConfirmPasswordController,
                          ),
                        ),
                        const SizedBox(height: 24),
                        SemanticButton(
                          label: _showSignUp ? 'Create account' : 'Sign in',
                          child: SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _isSubmitting ? null : _handleSubmit,
                              style: FilledButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                textStyle: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(
                                      AppBorderRadius.large),
                                ),
                              ),
                              child: _isSubmitting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : Text(_showSignUp
                                      ? 'Create account'
                                      : 'Sign in'),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (!_showSignUp)
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context)
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Forgot password tapped — connect to reset flow.',
                                      ),
                                    ),
                                  );
                              },
                              child: const Text('Forgot password?'),
                            ),
                          ),
                        const SizedBox(height: 12),
                        Row(
                          children: const [
                            Expanded(child: Divider()),
                            SizedBox(width: 12),
                            Text('Or continue with'),
                            SizedBox(width: 12),
                            Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SemanticButton(
                          label: 'Continue with Google',
                          child: SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {
                                ScaffoldMessenger.of(context)
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Google sign-in tapped — connect to provider.',
                                      ),
                                    ),
                                  );
                              },
                              icon: const Icon(
                                Icons.login,
                                size: 20,
                                color: AppColors.onboardingGoogle,
                              ),
                              label: const Text('Continue with Google'),
                              style: OutlinedButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                side: const BorderSide(
                                    color: AppColors.dividerColor),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(
                                      AppBorderRadius.large),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          _showSignUp
                              ? 'Already have an account?'
                              : 'New to MyOrbit?',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        TextButton(
                          onPressed: () => _toggleMode(!_showSignUp),
                          child: Text(
                            _showSignUp
                                ? 'Sign in instead'
                                : 'Create an account',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthModeToggle extends StatelessWidget {
  const _AuthModeToggle({
    required this.isSignUp,
    required this.onChanged,
  });

  final bool isSignUp;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final selectedColor = Theme.of(context).colorScheme.primary;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundLight,
        borderRadius: BorderRadius.circular(AppBorderRadius.large),
        border: Border.all(color: AppColors.dividerColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: _AuthModeOption(
              label: 'Sign in',
              selected: !isSignUp,
              onTap: () => onChanged(false),
              selectedColor: selectedColor,
            ),
          ),
          Expanded(
            child: _AuthModeOption(
              label: 'Sign up',
              selected: isSignUp,
              onTap: () => onChanged(true),
              selectedColor: selectedColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _AuthModeOption extends StatelessWidget {
  const _AuthModeOption({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.selectedColor,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color selectedColor;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          boxShadow: selected ? AppShadows.subtle : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: selected ? selectedColor : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _SignInForm extends StatelessWidget {
  const _SignInForm({
    required this.formKey,
    required this.emailController,
    required this.passwordController,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final TextEditingController passwordController;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        children: [
          _AuthTextField(
            fieldKey: const Key('sign_in_email_field'),
            controller: emailController,
            label: 'Email address',
            keyboardType: TextInputType.emailAddress,
            validator: _emailValidator,
            autofillHints: const [AutofillHints.email],
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_in_password_field'),
            controller: passwordController,
            label: 'Password',
            obscureText: true,
            validator: _passwordValidator,
            autofillHints: const [AutofillHints.password],
          ),
        ],
      ),
    );
  }
}

class _SignUpForm extends StatelessWidget {
  const _SignUpForm({
    required this.formKey,
    required this.nameController,
    required this.emailController,
    required this.passwordController,
    required this.confirmPasswordController,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        children: [
          _AuthTextField(
            fieldKey: const Key('sign_up_name_field'),
            controller: nameController,
            label: 'Full name',
            textCapitalization: TextCapitalization.words,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please enter your name';
              }
              return null;
            },
            autofillHints: const [AutofillHints.name],
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_up_email_field'),
            controller: emailController,
            label: 'Email address',
            keyboardType: TextInputType.emailAddress,
            validator: _emailValidator,
            autofillHints: const [AutofillHints.email],
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_up_password_field'),
            controller: passwordController,
            label: 'Password',
            obscureText: true,
            validator: _passwordValidator,
            autofillHints: const [AutofillHints.newPassword],
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_up_confirm_password_field'),
            controller: confirmPasswordController,
            label: 'Confirm password',
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please re-enter your password';
              }
              if (value != passwordController.text) {
                return 'Passwords do not match';
              }
              return null;
            },
            autofillHints: const [AutofillHints.newPassword],
          ),
        ],
      ),
    );
  }
}

class _AuthTextField extends StatelessWidget {
  const _AuthTextField({
    required this.controller,
    required this.label,
    this.keyboardType,
    this.obscureText = false,
    this.validator,
    this.autofillHints,
    this.textCapitalization = TextCapitalization.none,
    this.fieldKey,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? Function(String?)? validator;
  final Iterable<String>? autofillHints;
  final TextCapitalization textCapitalization;
  final Key? fieldKey;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      key: fieldKey,
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      validator: validator,
      autofillHints: autofillHints,
      textCapitalization: textCapitalization,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          borderSide: const BorderSide(color: AppColors.dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          borderSide: const BorderSide(color: AppColors.dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }
}

String? _emailValidator(String? value) {
  if (value == null || value.trim().isEmpty) {
    return 'Please enter your email';
  }
  final pattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  if (!pattern.hasMatch(value.trim())) {
    return 'Enter a valid email address';
  }
  return null;
}

String? _passwordValidator(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter your password';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}
