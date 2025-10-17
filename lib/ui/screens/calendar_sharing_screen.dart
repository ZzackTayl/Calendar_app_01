import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';

class CalendarSharingScreen extends StatefulWidget {
  const CalendarSharingScreen({super.key});

  @override
  State<CalendarSharingScreen> createState() => _CalendarSharingScreenState();
}

class _CalendarSharingScreenState extends State<CalendarSharingScreen> {
  int _currentStep = 0;
  final Set<String> _selectedContacts = {'Alex Chen'};
  bool _canViewDetails = true;
  bool _canEditEvents = false;
  bool _shareAvailability = true;
  final TextEditingController _messageController = TextEditingController(
    text:
        'Hi! I’d like to share MyOrbit with you so we can coordinate more easily.',
  );

  final List<String> _suggestedContacts = const [
    'Alex Chen',
    'Sam Rivera',
    'Jordan Kim',
    'Casey Morgan',
    'Taylor Brooks',
  ];

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  void _handleContinue() {
    if (_currentStep == 0 && _selectedContacts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Pick at least one person to share with.')),
      );
      return;
    }

    if (_currentStep == 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Sharing request sent to ${_selectedContacts.join(', ')}.',
          ),
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

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Share Your Calendar'),
      ),
      body: SafeArea(
        minimum: const EdgeInsets.only(top: 24),
        child: Stepper(
          currentStep: _currentStep,
          onStepContinue: _handleContinue,
          onStepCancel: _handleBack,
          controlsBuilder: (context, details) {
            final isLastStep = _currentStep == 2;
            return Row(
              children: [
                FilledButton.icon(
                  onPressed: details.onStepContinue,
                  icon: Icon(isLastStep ? Icons.send : Icons.arrow_forward),
                  label: Text(isLastStep ? 'Send invites' : 'Continue'),
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
              title: const Text('Choose people'),
              isActive: _currentStep >= 0,
              state: _currentStep > 0 ? StepState.complete : StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pick the contacts who should see this calendar.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: palette.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  ..._suggestedContacts.map(
                    (name) => CheckboxListTile(
                      title: Text(name),
                      value: _selectedContacts.contains(name),
                      onChanged: (selected) {
                        setState(() {
                          if (selected ?? false) {
                            _selectedContacts.add(name);
                          } else {
                            _selectedContacts.remove(name);
                          }
                        });
                      },
                    ),
                  ),
                ],
              ),
            ),
            Step(
              title: const Text('Set permissions'),
              isActive: _currentStep >= 1,
              state: _currentStep > 1 ? StepState.complete : StepState.indexed,
              content: Column(
                children: [
                  SwitchListTile(
                    title: const Text('View event details'),
                    subtitle: const Text('Titles, locations, participants'),
                    value: _canViewDetails,
                    onChanged: (value) =>
                        setState(() => _canViewDetails = value),
                  ),
                  SwitchListTile(
                    title: const Text('Suggest edits'),
                    subtitle: const Text(
                      'Allow them to propose time changes to shared events',
                    ),
                    value: _canEditEvents,
                    onChanged: (value) =>
                        setState(() => _canEditEvents = value),
                  ),
                  SwitchListTile(
                    title: const Text('Share my availability signals'),
                    subtitle: const Text(
                      'Great for connections who coordinate around your status',
                    ),
                    value: _shareAvailability,
                    onChanged: (value) =>
                        setState(() => _shareAvailability = value),
                  ),
                ],
              ),
            ),
            Step(
              title: const Text('Review & send'),
              isActive: _currentStep >= 2,
              state: StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'We’ll send a share invite and keep track of who accepts.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: palette.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    elevation: 0,
                    color: palette.subtleSurface,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Sharing with ${_selectedContacts.join(', ')}',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          _buildPermissionChip(
                            context,
                            enabled: _canViewDetails,
                            label: 'Can view event details',
                          ),
                          _buildPermissionChip(
                            context,
                            enabled: _canEditEvents,
                            label: 'Can suggest edits',
                          ),
                          _buildPermissionChip(
                            context,
                            enabled: _shareAvailability,
                            label: 'Sees availability signals',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _messageController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Optional message',
                      hintText: 'Why are you sharing this calendar?',
                    ),
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

  Widget _buildPermissionChip(
    BuildContext context, {
    required bool enabled,
    required String label,
  }) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 200),
      opacity: enabled ? 1 : 0.4,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Icon(
              enabled ? Icons.check_circle : Icons.radio_button_unchecked,
              color: enabled ? AppColors.signalAvailable : AppColors.textLight,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
