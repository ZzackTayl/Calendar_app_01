import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';
import '../../logic/providers/auth_providers.dart';
import '../widgets/accessibility/semantic_button.dart';

/// Screen that verifies user email address after signup
/// 
/// Waits for user to verify their email before proceeding to onboarding.
/// Shows a countdown timer and allows resending verification email.
class EmailVerificationScreen extends ConsumerStatefulWidget {
  final String email;

  const EmailVerificationScreen({
    super.key,
    required this.email,
  });

  @override
  ConsumerState<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState
    extends ConsumerState<EmailVerificationScreen> {
  late Timer _verificationCheckTimer;
  late Timer _resendCooldownTimer;
  int _secondsUntilResend = 0;
  bool _isChecking = false;
  String? _checkError;
  String? _resendError;

  @override
  void initState() {
    super.initState();
    _startVerificationCheck();
  }

  @override
  void dispose() {
    _verificationCheckTimer.cancel();
    _resendCooldownTimer.cancel();
    super.dispose();
  }

  void _startVerificationCheck() {
    _verificationCheckTimer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => _checkEmailVerified(),
    );
  }

  Future<void> _checkEmailVerified() async {
    if (!mounted) return;

    setState(() {
      _isChecking = true;
      _checkError = null;
    });

    try {
      // Refresh session to get latest auth state
      await SupabaseService.clientOrThrow.auth.refreshSession();

      final user = SupabaseService.currentUser;
      if (user != null && user.emailConfirmedAt != null) {
        // Email is verified! Proceed to onboarding
        if (!mounted) return;
        _verificationCheckTimer.cancel();

        // Update auth state
        ref.read(currentUserProvider.notifier).setUser(user);

        // Navigate to onboarding
        if (mounted) {
          context.pushReplacement('/onboarding');
        }
      } else if (user == null) {
        // User session lost
        if (!mounted) return;
        setState(() {
          _checkError = 'Session lost. Please sign up again.';
        });
        _verificationCheckTimer.cancel();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _checkError = 'Failed to check verification status';
      });
      debugPrint('Error checking email verification: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isChecking = false;
        });
      }
    }
  }

  Future<void> _resendVerificationEmail() async {
    if (!mounted) return;

    setState(() {
      _resendError = null;
    });

    // TODO: Implement email resend via Supabase edge function
    // This requires setting up a backend edge function to resend verification emails
    setState(() {
      _resendError = 'Email resend feature coming soon. '
          'Please check your spam folder or request a new account if needed.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final canResend = _secondsUntilResend <= 0 && !_isChecking;

    return WillPopScope(
      onWillPop: () async {
        // Prevent back navigation - user must verify or sign out
        return false;
      },
      child: Scaffold(
        backgroundColor: palette.background,
        body: Container(
          decoration: BoxDecoration(
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                  )
                : AppGradients.backgroundFor(palette.brightness),
          ),
          child: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Email icon
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: theme.colorScheme.primaryContainer,
                        ),
                        child: Icon(
                          Icons.mail_outline,
                          size: 40,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Title
                      Text(
                        'Verify Your Email',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: palette.textPrimary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),

                      // Subtitle with email
                      Text(
                        'We sent a verification link to:',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: palette.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.email,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),

                      // Instructions
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer
                              .withOpacity(0.3),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: theme.colorScheme.primary.withOpacity(0.2),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Please follow these steps:',
                              style: theme.textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: palette.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            _instructionRow(
                              '1.',
                              'Open your email and find the verification message',
                              theme,
                            ),
                            const SizedBox(height: 8),
                            _instructionRow(
                              '2.',
                              'Click the verification link in the email',
                              theme,
                            ),
                            const SizedBox(height: 8),
                            _instructionRow(
                              '3.',
                              'Return here and your account will be ready',
                              theme,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Status message
                      if (_isChecking) ...[
                        SizedBox(
                          height: 40,
                          child: Center(
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(
                                theme.colorScheme.primary,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Checking verification status...',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: palette.textSecondary,
                          ),
                        ),
                      ] else if (_checkError != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.error.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: theme.colorScheme.error.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            _checkError!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.error,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ] else ...[
                        Text(
                          'Checking your email... (auto-refresh every 3 seconds)',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: palette.textSecondary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],

                      if (_resendError != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.error.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: theme.colorScheme.error.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            _resendError!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.error,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],

                      const SizedBox(height: 32),

                      // Resend button
                      SemanticButton(
                        label: canResend
                            ? 'Resend Verification Email'
                            : 'Resend Email in $_secondsUntilResend seconds',
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: canResend ? _resendVerificationEmail : null,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            child: Text(
                              canResend
                                  ? 'Resend Verification Email'
                                  : 'Resend Email in $_secondsUntilResend seconds',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Sign out button
                      SemanticButton(
                        label: 'Sign Out',
                        child: TextButton(
                          onPressed: () => _handleSignOut(ref),
                          child: const Text('Sign Out'),
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
    );
  }

  Widget _instructionRow(String number, String text, ThemeData theme) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          number,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppPalette.of(context).textPrimary,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleSignOut(WidgetRef ref) async {
    try {
      final notifier = ref.read(authControllerProvider.notifier);
      await notifier.signOut();
      if (!mounted) return;
      context.go('/auth');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: const Text('Failed to sign out'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
    }
  }
}
