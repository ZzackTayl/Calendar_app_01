import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme_constants.dart';
import '../../core/services/analytics_service.dart';
import '../../domain/contact.dart';
import '../../logic/providers/calendar_sharing_provider.dart';
import '../../logic/providers/contact_providers.dart';
import '../widgets/app_gradient_background.dart';

class CalendarSharingScreen extends ConsumerStatefulWidget {
  const CalendarSharingScreen({super.key});

  @override
  ConsumerState<CalendarSharingScreen> createState() =>
      _CalendarSharingScreenState();
}

class _CalendarSharingScreenState extends ConsumerState<CalendarSharingScreen> {
  int _currentStep = 0;
  final Set<String> _selectedContactIds = {};
  bool _canViewDetails = true;
  bool _canEditEvents = false;
  bool _shareAvailability = true;
  bool _isSubmitting = false;
  final TextEditingController _messageController = TextEditingController(
    text:
        'Hi! I’d like to share MyOrbit with you so we can coordinate more easily.',
  );

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  void _handleContinue(List<Contact> contacts) {
    if (_currentStep == 0 && _selectedContactIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Pick at least one person to share with.')),
      );
      return;
    }

    if (_currentStep == 2) {
      _sendShareInvites();
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

  Future<void> _sendShareInvites() async {
    if (_selectedContactIds.isEmpty || _isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);

    final controller = ref.read(calendarSharingControllerProvider.notifier);
    final permission = _canViewDetails ? 'visible' : 'semiVisible';
    await AnalyticsService.logCustomEvent(
      'calendar_share_submitted',
      parameters: <String, Object?>{
        'contact_count': _selectedContactIds.length,
        'permission': permission,
        'can_edit': _canEditEvents,
        'share_availability': _shareAvailability,
        'has_custom_message': _messageController.text.trim().isNotEmpty,
      },
    );
    final result = await controller.sendShareInvites(
      contactIds: _selectedContactIds.toList(),
      permission: permission,
      canViewDetails: _canViewDetails,
      canEditEvents: _canEditEvents,
      shareAvailability: _shareAvailability,
      message: _messageController.text.trim().isEmpty
          ? null
          : _messageController.text.trim(),
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    await result.when(
      success: (_) async {
        unawaited(
          AnalyticsService.logCustomEvent(
            'calendar_share_completed',
            parameters: <String, Object?>{
              'contact_count': _selectedContactIds.length,
              'permission': permission,
              'can_edit': _canEditEvents,
              'share_availability': _shareAvailability,
            },
          ),
        );
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                'Calendar shared with ${_selectedContactIds.length} connection(s).',
              ),
            ),
          );
        Navigator.of(context).pop();
      },
      failure: (message, _) async {
        unawaited(
          AnalyticsService.logCustomEvent(
            'calendar_share_failed',
            parameters: <String, Object?>{
              'contact_count': _selectedContactIds.length,
              'permission': permission,
              'can_edit': _canEditEvents,
              'share_availability': _shareAvailability,
              'reason': _sanitizeAnalyticsMessage(message),
            },
          ),
        );
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
      },
    );
  }

  void _syncSelectionWithContacts(List<Contact> contacts) {
    final availableIds = contacts.map((c) => c.id).toSet();
    if (_selectedContactIds.isEmpty && contacts.isNotEmpty) {
      _selectedContactIds.add(contacts.first.id);
    } else {
      _selectedContactIds.removeWhere((id) => !availableIds.contains(id));
    }
  }

  String _sanitizeAnalyticsMessage(String message) {
    final sanitized = message.trim();
    if (sanitized.isEmpty) {
      return 'unknown';
    }
    return sanitized.length <= 80 ? sanitized : sanitized.substring(0, 80);
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final contactsAsync = ref.watch(contactListProvider);
    final controllerState = ref.watch(calendarSharingControllerProvider);

    final contacts = contactsAsync.maybeWhen(
      data: (data) => data
          .where((contact) => contact.status != ContactStatus.contactOnly)
          .toList(),
      orElse: () => const <Contact>[],
    );

    _syncSelectionWithContacts(contacts);

    final isLoadingContacts = contactsAsync.isLoading;
    final contactsError = contactsAsync.whenOrNull(
      error: (error, stack) => error.toString(),
    );

    final isSubmitting = _isSubmitting || controllerState.isLoading;

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        title: const Text('Share Your Calendar'),
      ),
      body: AppGradientBackground(
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: Stepper(
            currentStep: _currentStep,
            onStepContinue:
                isSubmitting ? null : () => _handleContinue(contacts),
            onStepCancel: isSubmitting ? null : _handleBack,
            controlsBuilder: (context, details) {
              final isLastStep = _currentStep == 2;
              return Row(
                children: [
                  FilledButton.icon(
                    onPressed: isSubmitting ? null : details.onStepContinue,
                    icon: isSubmitting && isLastStep
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(isLastStep ? Icons.send : Icons.arrow_forward),
                    label: Text(isLastStep ? 'Send invites' : 'Continue'),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: isSubmitting ? null : details.onStepCancel,
                    child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                  ),
                ],
              );
            },
            steps: [
              Step(
                title: const Text('Choose people'),
                isActive: _currentStep >= 0,
                state:
                    _currentStep > 0 ? StepState.complete : StepState.indexed,
                content: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pick the contacts who should see this calendar.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: palette.textSecondary,
                          ),
                    ),
                    const SizedBox(height: 12),
                    if (isLoadingContacts)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 32),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (contacts.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          contactsError ??
                              'No connections available yet. Add or invite partners first.',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: palette.textSecondary,
                                  ),
                        ),
                      )
                    else
                      SizedBox(
                        height: 220,
                        child: ListView.builder(
                          itemCount: contacts.length,
                          itemBuilder: (context, index) {
                            final contact = contacts[index];
                            final isSelected =
                                _selectedContactIds.contains(contact.id);
                            return CheckboxListTile(
                              title: Text(contact.name),
                              subtitle: Text(
                                contact.permission.name,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: palette.textSecondary,
                                    ),
                              ),
                              value: isSelected,
                              onChanged: (value) {
                                setState(() {
                                  if (value ?? false) {
                                    _selectedContactIds.add(contact.id);
                                  } else {
                                    _selectedContactIds.remove(contact.id);
                                  }
                                });
                              },
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
              Step(
                title: const Text('Set permissions'),
                isActive: _currentStep >= 1,
                state:
                    _currentStep > 1 ? StepState.complete : StepState.indexed,
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
                          'Allow them to propose time changes to shared events'),
                      value: _canEditEvents,
                      onChanged: (value) =>
                          setState(() => _canEditEvents = value),
                    ),
                    SwitchListTile(
                      title: const Text('Share my availability signals'),
                      subtitle: const Text(
                          'Great for connections who coordinate around your status'),
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
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: palette.textSecondary,
                          ),
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
                              'Sharing with ${_selectedContactIds.length} connection(s)',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 12),
                            _buildPermissionChip(context,
                                enabled: _canViewDetails,
                                label: 'Can view event details'),
                            _buildPermissionChip(context,
                                enabled: _canEditEvents,
                                label: 'Can suggest edits'),
                            _buildPermissionChip(context,
                                enabled: _shareAvailability,
                                label: 'Can see availability'),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _messageController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Personal message (optional)',
                                hintText:
                                    'Add a note to include in the invite email',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionChip(BuildContext context,
      {required bool enabled, required String label}) {
    if (!enabled) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Chip(
        avatar: const Icon(Icons.check, size: 16),
        label: Text(label),
      ),
    );
  }
}
