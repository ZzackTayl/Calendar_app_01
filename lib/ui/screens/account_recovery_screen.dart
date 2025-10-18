import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';

enum _RecoveryMethod { email, sms }

class AccountRecoveryScreen extends StatefulWidget {
  const AccountRecoveryScreen({super.key});

  @override
  State<AccountRecoveryScreen> createState() => _AccountRecoveryScreenState();
}

class _AccountRecoveryScreenState extends State<AccountRecoveryScreen> {
  int _currentStep = 0;
  _RecoveryMethod _method = _RecoveryMethod.email;
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  bool _codeSent = false;
  bool _passwordsMatch = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleContinue() {
    if (_currentStep == 0) {
      if (_identifierController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter your email or phone number.')),
        );
        return;
      }
    } else if (_currentStep == 1) {
      if (_codeController.text.length < 4) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter the 4–6 digit code we sent.')),
        );
        return;
      }
    } else if (_currentStep == 2) {
      final matches = _newPasswordController.text == _confirmPasswordController.text &&
          _newPasswordController.text.length >= 8;
      setState(() => _passwordsMatch = matches);
      if (!matches) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Passwords must match and be at least 8 characters long.'),
          ),
        );
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your password has been reset. You can sign in now.'),
        ),
      );
      Navigator.of(context).pop();
      return;
    }

    setState(() => _currentStep += 1);
  }

  void _handleBack() {
    if (_currentStep == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _currentStep -= 1);
  }

  Future<void> _sendRecoveryCode() async {
    if (_identifierController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add an email or phone first.')),
      );
      return;
    }
    setState(() => _codeSent = true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _method == _RecoveryMethod.email
              ? 'We sent a recovery link to ${_identifierController.text}.'
              : 'We texted a code to ${_identifierController.text}.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Recovery'),
      ),
      body: SafeArea(
        minimum: const EdgeInsets.only(top: 24),
        child: Stepper(
          currentStep: _currentStep,
          onStepCancel: _handleBack,
          onStepContinue: _handleContinue,
          controlsBuilder: (context, details) {
            final isLastStep = _currentStep == 2;
            return Row(
              children: [
                FilledButton(
                  onPressed: details.onStepContinue,
                  child: Text(isLastStep ? 'Reset password' : 'Continue'),
                ),
                const SizedBox(width: 12),
                TextButton(
                  onPressed: details.onStepCancel,
                  child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                ),
              ],
            );
          },
          steps: [
            Step(
              title: const Text('Choose recovery method'),
              isActive: _currentStep >= 0,
              state: _currentStep > 0 ? StepState.complete : StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'We’ll confirm it’s you using one of the trusted channels on file.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: palette.textSecondary),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<_RecoveryMethod>(
                    initialValue: _method,
                    decoration: const InputDecoration(
                      labelText: 'Delivery method',
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: _RecoveryMethod.email,
                        child: Text('Email a recovery link'),
                      ),
                      DropdownMenuItem(
                        value: _RecoveryMethod.sms,
                        child: Text('Text a verification code'),
                      ),
                    ],
                    onChanged: (value) => setState(() {
                      _method = value ?? _RecoveryMethod.email;
                    }),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _method == _RecoveryMethod.email
                        ? 'Good if you can access your inbox.'
                        : 'Requires a phone number capable of receiving SMS.',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: palette.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _identifierController,
                    keyboardType: _method == _RecoveryMethod.email
                        ? TextInputType.emailAddress
                        : TextInputType.phone,
                    autofillHints: _method == _RecoveryMethod.email
                        ? const [AutofillHints.email]
                        : const [AutofillHints.telephoneNumber],
                    decoration: InputDecoration(
                      labelText:
                          _method == _RecoveryMethod.email ? 'Email address' : 'Phone number',
                    ),
                  ),
                ],
              ),
            ),
            Step(
              title: const Text('Verify it’s you'),
              isActive: _currentStep >= 1,
              state: _currentStep > 1 ? StepState.complete : StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _method == _RecoveryMethod.email
                        ? 'Enter the code from our email.'
                        : 'Enter the text message code.',
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
                    onPressed: _sendRecoveryCode,
                    icon: const Icon(Icons.refresh),
                    label: Text(_codeSent ? 'Resend code' : 'Send code'),
                  ),
                ],
              ),
            ),
            Step(
              title: const Text('Create a new password'),
              isActive: _currentStep >= 2,
              state: _passwordsMatch ? StepState.indexed : StepState.error,
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
                    title: const Text('Log out other devices after reset'),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
