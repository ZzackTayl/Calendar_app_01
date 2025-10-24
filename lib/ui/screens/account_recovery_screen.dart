import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../widgets/app_gradient_background.dart';
import '../../logic/services/api_service.dart';

class AccountRecoveryScreen extends StatefulWidget {
  const AccountRecoveryScreen({super.key});

  @override
  State<AccountRecoveryScreen> createState() => _AccountRecoveryScreenState();
}

class _AccountRecoveryScreenState extends State<AccountRecoveryScreen> {
  int _currentStep = 0;
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  bool _codeSent = false;
  bool _passwordsMatch = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _identifierController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleContinue() async {
    if (_currentStep == 0) {
      if (_identifierController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter your email or phone number.')),
        );
        return;
      }
      await _sendRecoveryCode();
    } else if (_currentStep == 1) {
      if (_codeController.text.length < 4) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter the 4-6 digit code we sent.')),
        );
        return;
      }
      await _verifyRecoveryCode();
    } else if (_currentStep == 2) {
      final matches =
          _newPasswordController.text == _confirmPasswordController.text &&
              _newPasswordController.text.length >= 8;
      setState(() => _passwordsMatch = matches);
      if (!matches) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
                Text('Passwords must match and be at least 8 characters long.'),
          ),
        );
        return;
      }
      await _resetPassword();
    }

    if (_currentStep < 2 && _isLoading == false) {
      setState(() => _currentStep += 1);
    }
  }

  void _handleBack() {
    if (_currentStep == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _currentStep -= 1);
  }

  Future<void> _sendRecoveryCode() async {
    setState(() => _isLoading = true);
    try {
      final result = await AccountRecoveryApi.requestPasswordReset(
          _identifierController.text);

      if (mounted) {
        result.when(
          success: (_) {
            setState(() => _codeSent = true);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                    'We sent a recovery link to ${_identifierController.text}.'),
              ),
            );
          },
          failure: (message, error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to send recovery code: $message'),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error sending recovery code: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _verifyRecoveryCode() async {
    setState(() => _isLoading = true);
    try {
      final result = await AccountRecoveryApi.verifyRecoveryCode(
        identifier: _identifierController.text,
        code: _codeController.text,
      );

      if (mounted) {
        result.when(
          success: (_) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Code verified successfully.')),
            );
          },
          failure: (message, error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to verify code: $message'),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error verifying code: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _resetPassword() async {
    setState(() => _isLoading = true);
    try {
      final result = await AccountRecoveryApi.resetPassword(
        email: _identifierController.text,
        token: _codeController.text,
        newPassword: _newPasswordController.text,
      );

      if (mounted) {
        result.when(
          success: (_) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content:
                    Text('Your password has been reset. You can sign in now.'),
              ),
            );
            Navigator.of(context).pop();
          },
          failure: (message, error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to reset password: $message'),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error resetting password: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        title: const Text('Account Recovery'),
      ),
      body: AppGradientBackground(
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: Stack(
            children: [
              Stepper(
                currentStep: _currentStep,
                onStepCancel: _isLoading ? null : _handleBack,
                onStepContinue: _isLoading ? null : _handleContinue,
                controlsBuilder: (context, details) {
                  final isLastStep = _currentStep == 2;
                  return Row(
                    children: [
                      FilledButton(
                        onPressed: _isLoading ? null : details.onStepContinue,
                        child: Text(isLastStep ? 'Reset password' : 'Continue'),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: _isLoading ? null : details.onStepCancel,
                        child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                      ),
                    ],
                  );
                },
                steps: [
                  Step(
                    title: const Text('Enter your email'),
                    isActive: _currentStep >= 0,
                    state: _currentStep > 0
                        ? StepState.complete
                        : StepState.indexed,
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'We will send a recovery link to your email address.',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: palette.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _identifierController,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          decoration: const InputDecoration(
                            labelText: 'Email address',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Step(
                    title: const Text('Verify it is you'),
                    isActive: _currentStep >= 1,
                    state: _currentStep > 1
                        ? StepState.complete
                        : StepState.indexed,
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Enter the code from the recovery email we sent.',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: palette.textSecondary),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _codeController,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          decoration: const InputDecoration(
                            labelText: 'Verification code',
                          ),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: _isLoading ? null : _sendRecoveryCode,
                          icon: const Icon(Icons.refresh),
                          label: Text(_codeSent ? 'Resend code' : 'Send code'),
                        ),
                      ],
                    ),
                  ),
                  Step(
                    title: const Text('Create a new password'),
                    isActive: _currentStep >= 2,
                    state:
                        _passwordsMatch ? StepState.indexed : StepState.error,
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextField(
                          controller: _newPasswordController,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'New password',
                            helperText: 'Use at least 8 characters.',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _confirmPasswordController,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'Confirm new password',
                          ),
                        ),
                        const SizedBox(height: 12),
                        CheckboxListTile(
                          value: true,
                          onChanged: (_) {},
                          title:
                              const Text('Log out other devices after reset'),
                          controlAffinity: ListTileControlAffinity.leading,
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ],
              ),
              if (_isLoading)
                Container(
                  color: Colors.black.withValues(alpha: 0.3),
                  child: const Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
