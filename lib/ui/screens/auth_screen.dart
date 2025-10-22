import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';
import '../../l10n/app_localizations.dart';
import '../../logic/providers/auth_providers.dart';
import '../widgets/accessibility/semantic_button.dart';

const _hasOnboardedKey = 'hasOnboarded';

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

    final email = _showSignUp
        ? _signUpEmailController.text.trim()
        : _signInEmailController.text.trim();
    final password = _showSignUp
        ? _signUpPasswordController.text.trim()
        : _signInPasswordController.text.trim();

    if (_showSignUp) {
      final confirmPassword = _signUpConfirmPasswordController.text.trim();
      if (password != confirmPassword) {
        final l10n = AppLocalizations.of(context);
        _showSnackBar(l10n.authErrorPasswordsMatch);
        return;
      }
      if (password.length < 8) {
        final l10n = AppLocalizations.of(context);
        _showSnackBar(l10n.authErrorPasswordMinLength);
        return;
      }
    }

    final notifier = ref.read(authControllerProvider.notifier);
    final Result<void> result = _showSignUp
        ? await notifier.signUpWithEmail(email: email, password: password)
        : await notifier.signInWithEmail(email: email, password: password);

    if (!mounted) return;

    await result.when(
      success: (_) async {
        await _navigateAfterAuth(isSignUp: _showSignUp);
      },
      failure: (message, exception) async {
        final l10n = AppLocalizations.of(context);
        final displayMessage = exception is AuthOfflineException
            ? exception.message
            : (message.isEmpty ? l10n.authErrorAuthFailed : message);
        _showSnackBar(displayMessage);
      },
    );
  }

  Future<void> _handleGoogleSignIn() async {
    if (!SupabaseService.isConfigured) {
      final l10n = AppLocalizations.of(context);
      _showSnackBar(l10n.authErrorSupabaseNotConfigured);
      return;
    }

    final notifier = ref.read(authControllerProvider.notifier);
    final result = await notifier.signInWithGoogle();
    if (!mounted) return;

    await result.when(
      success: (_) async {
        await _navigateAfterAuth(isSignUp: false);
      },
      failure: (message, exception) async {
        final l10n = AppLocalizations.of(context);
        final displayMessage = exception is AuthOfflineException
            ? exception.message
            : (message.isEmpty ? l10n.authErrorAuthFailed : message);
        _showSnackBar(displayMessage);
      },
    );
  }

  Future<void> _navigateAfterAuth({required bool isSignUp}) async {
    if (!mounted) return;

    if (isSignUp) {
      // For signup, navigate to email verification screen
      // Pass the email as extra parameter
      final email = _signUpEmailController.text.trim();
      if (mounted) {
        context.push('/verify-email', extra: email);
      }
      return;
    }

    // For sign in, go to dashboard or onboarding depending on status
    final prefs = await SharedPreferences.getInstance();
    final hasOnboarded = prefs.getBool(_hasOnboardedKey) ?? false;

    if (!mounted) return;
    context.go(hasOnboarded ? '/dashboard' : '/onboarding');
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final authState = ref.watch(authControllerProvider);
    final logoAsset = AppAssets.logoForBrightness(theme.brightness);
    final isProcessing = authState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: BoxDecoration(
            gradient: theme.brightness == Brightness.dark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                  )
                : const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
                  )),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
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
                          logoAsset,
                          height: 92,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          AppLocalizations.of(context).authWelcomeTitle,
                          style: textTheme.headlineSmall?.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _showSignUp
                              ? AppLocalizations.of(context).authSignUpDescription
                              : AppLocalizations.of(context).authSignInDescription,
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppColors.textPrimary,
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
                            isSubmitting: authState.isLoading,
                            onSubmit: _handleSubmit,
                          ),
                          secondChild: _SignUpForm(
                            formKey: _signUpFormKey,
                            nameController: _signUpNameController,
                            emailController: _signUpEmailController,
                            passwordController: _signUpPasswordController,
                            confirmPasswordController:
                                _signUpConfirmPasswordController,
                            isSubmitting: authState.isLoading,
                            onSubmit: _handleSubmit,
                          ),
                        ),
                        const SizedBox(height: 24),
                        SemanticButton(
                          label: _showSignUp
                              ? AppLocalizations.of(context).authCreateAccountButton
                              : AppLocalizations.of(context).authSignInButton,
                          child: SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed:
                                  authState.isLoading ? null : _handleSubmit,
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
                              child: authState.isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : Text(_showSignUp
                                      ? AppLocalizations.of(context).authCreateAccountButton
                                      : AppLocalizations.of(context).authSignInButton),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (!_showSignUp)
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () {
                                final l10n = AppLocalizations.of(context);
                                _showSnackBar(l10n.authForgotPasswordPlaceholder);
                              },
                              child: Text(
                                AppLocalizations.of(context).authForgotPasswordLink,
                              ),
                            ),
                          ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Expanded(child: Divider()),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).authOrContinueWith),
                            const SizedBox(width: 12),
                            const Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SemanticButton(
                          label: AppLocalizations.of(context).authContinueWithGoogle,
                          child: SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed:
                                  isProcessing ? null : _handleGoogleSignIn,
                              icon: const Icon(
                                Icons.login,
                                size: 20,
                                color: AppColors.onboardingGoogle,
                              ),
                              label: Text(
                                AppLocalizations.of(context).authContinueWithGoogle,
                              ),
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
                              ? AppLocalizations.of(context).authAlreadyHaveAccount
                              : AppLocalizations.of(context).authNewToMyOrbit,
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppColors.textPrimary,
                          ),
                        ),
                        TextButton(
                          onPressed: () => _toggleMode(!_showSignUp),
                          child: Text(
                            _showSignUp
                                ? AppLocalizations.of(context).authSignInInstead
                                : AppLocalizations.of(context).authCreateAccountLink,
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
            child: Builder(
              builder: (context) => _AuthModeOption(
                label: AppLocalizations.of(context).authSignInToggle,
                selected: !isSignUp,
                onTap: () => onChanged(false),
                selectedColor: selectedColor,
              ),
            ),
          ),
          Expanded(
            child: Builder(
              builder: (context) => _AuthModeOption(
                label: AppLocalizations.of(context).authSignUpToggle,
                selected: isSignUp,
                onTap: () => onChanged(true),
                selectedColor: selectedColor,
              ),
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
            color: selected ? selectedColor : AppColors.textPrimary.withValues(alpha: 0.7),
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
    required this.isSubmitting,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool isSubmitting;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Form(
      key: formKey,
      child: Column(
        children: [
          _AuthTextField(
            fieldKey: const Key('sign_in_email_field'),
            controller: emailController,
            label: l10n.authEmailLabel,
            keyboardType: TextInputType.emailAddress,
            validator: (value) => _emailValidator(context, value),
            autofillHints: const [AutofillHints.email],
            enabled: !isSubmitting,
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_in_password_field'),
            controller: passwordController,
            label: l10n.authPasswordLabel,
            obscureText: true,
            validator: (value) => _passwordValidator(context, value),
            autofillHints: const [AutofillHints.password],
            enabled: !isSubmitting,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => onSubmit(),
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
    required this.isSubmitting,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final bool isSubmitting;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Form(
      key: formKey,
      child: Column(
        children: [
          _AuthTextField(
            fieldKey: const Key('sign_up_name_field'),
            controller: nameController,
            label: l10n.authFullNameLabel,
            textCapitalization: TextCapitalization.words,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return l10n.authValidationEnterName;
              }
              return null;
            },
            autofillHints: const [AutofillHints.name],
            enabled: !isSubmitting,
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_up_email_field'),
            controller: emailController,
            label: l10n.authEmailLabel,
            keyboardType: TextInputType.emailAddress,
            validator: (value) => _emailValidator(context, value),
            autofillHints: const [AutofillHints.email],
            enabled: !isSubmitting,
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_up_password_field'),
            controller: passwordController,
            label: l10n.authPasswordLabel,
            obscureText: true,
            validator: (value) => _passwordValidator(context, value),
            autofillHints: const [AutofillHints.newPassword],
            enabled: !isSubmitting,
          ),
          const SizedBox(height: 16),
          _AuthTextField(
            fieldKey: const Key('sign_up_confirm_password_field'),
            controller: confirmPasswordController,
            label: l10n.authConfirmPasswordLabel,
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return l10n.authValidationReenterPassword;
              }
              if (value != passwordController.text) {
                return l10n.authValidationPasswordsNoMatch;
              }
              return null;
            },
            autofillHints: const [AutofillHints.newPassword],
            enabled: !isSubmitting,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => onSubmit(),
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
    this.enabled = true,
    this.textInputAction,
    this.onFieldSubmitted,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? Function(String?)? validator;
  final Iterable<String>? autofillHints;
  final TextCapitalization textCapitalization;
  final Key? fieldKey;
  final bool enabled;
  final TextInputAction? textInputAction;
  final void Function(String)? onFieldSubmitted;

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
      enabled: enabled,
      textInputAction: textInputAction,
      onFieldSubmitted: onFieldSubmitted,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(
          color: AppColors.textPrimary.withValues(alpha: 0.7),
          fontSize: 16,
        ),
        floatingLabelStyle: TextStyle(
          color: AppColors.primary,
          fontSize: 14,
        ),
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

String? _emailValidator(BuildContext context, String? value) {
  final l10n = AppLocalizations.of(context);
  if (value == null || value.trim().isEmpty) {
    return l10n.authValidationEnterEmail;
  }
  final pattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  if (!pattern.hasMatch(value.trim())) {
    return l10n.authValidationValidEmail;
  }
  return null;
}

String? _passwordValidator(BuildContext context, String? value) {
  final l10n = AppLocalizations.of(context);
  if (value == null || value.isEmpty) {
    return l10n.authValidationEnterPassword;
  }
  if (value.length < 8) {
    return l10n.authValidationPasswordLength;
  }
  return null;
}
