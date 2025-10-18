import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';

enum _MigrationSource { google, apple }

class CalendarMigrationScreen extends StatefulWidget {
  const CalendarMigrationScreen({super.key});

  @override
  State<CalendarMigrationScreen> createState() => _CalendarMigrationScreenState();
}

class _CalendarMigrationScreenState extends State<CalendarMigrationScreen> {
  int _currentStep = 0;
  _MigrationSource _source = _MigrationSource.google;
  bool _includePastEvents = false;
  bool _includeSharedCalendars = true;
  bool _mergeDuplicates = true;
  bool _notifyPartners = true;

  void _handleContinue() {
    if (_currentStep == 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Import started from ${_source.label}. We’ll email you when it’s done.',
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
        title: const Text('Import Calendar Data'),
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
                FilledButton(
                  onPressed: details.onStepContinue,
                  child: Text(isLastStep ? 'Start import' : 'Continue'),
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
              title: const Text('Choose a source'),
              isActive: _currentStep >= 0,
              state: _currentStep > 0 ? StepState.complete : StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Connect to another calendar service to copy events into MyOrbit.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: palette.textSecondary),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<_MigrationSource>(
                    initialValue: _source,
                    decoration: const InputDecoration(
                      labelText: 'Calendar provider',
                    ),
                    items: _MigrationSource.values
                        .map(
                          (source) => DropdownMenuItem(
                            value: source,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(source.icon, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Flexible(
                                  fit: FlexFit.loose,
                                  child: Text(source.label),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (value) => setState(() => _source = value ?? _source),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _source.subtitle,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: palette.textSecondary),
                  ),
                ],
              ),
            ),
            Step(
              title: const Text('Match calendars'),
              isActive: _currentStep >= 1,
              state: _currentStep > 1 ? StepState.complete : StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pick what to bring over. You can review everything before anything goes live.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: palette.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: const Text('Include events from the past 12 months'),
                    value: _includePastEvents,
                    onChanged: (value) => setState(() => _includePastEvents = value),
                  ),
                  SwitchListTile(
                    title: const Text('Import shared calendars'),
                    subtitle: const Text('We’ll respect privacy settings.'),
                    value: _includeSharedCalendars,
                    onChanged: (value) => setState(() => _includeSharedCalendars = value),
                  ),
                  SwitchListTile(
                    title: const Text('Merge duplicates automatically'),
                    value: _mergeDuplicates,
                    onChanged: (value) => setState(() => _mergeDuplicates = value),
                  ),
                ],
              ),
            ),
            Step(
              title: const Text('Review changes'),
              isActive: _currentStep >= 2,
              state: StepState.indexed,
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'We’ll generate a migration report when the import finishes.',
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
                            'Summary',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          _buildSummaryRow(
                            'Source',
                            _source.label,
                          ),
                          _buildSummaryRow(
                            'Past events',
                            _includePastEvents ? 'Last 12 months' : 'Upcoming only',
                          ),
                          _buildSummaryRow(
                            'Shared calendars',
                            _includeSharedCalendars ? 'Included' : 'Excluded',
                          ),
                          _buildSummaryRow(
                            'Duplicate handling',
                            _mergeDuplicates ? 'Merge automatically' : 'Flag for review',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    value: _notifyPartners,
                    onChanged: (value) => setState(() => _notifyPartners = value ?? true),
                    title: const Text('Notify connections when new events arrive'),
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

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension on _MigrationSource {
  String get label {
    switch (this) {
      case _MigrationSource.google:
        return 'Google Calendar';
      case _MigrationSource.apple:
        return 'Apple Calendar (iCloud)';
    }
  }

  String get subtitle {
    switch (this) {
      case _MigrationSource.google:
        return 'Connect with OAuth and pick which calendars to import.';
      case _MigrationSource.apple:
        return 'Sync with your iCloud calendars and events.';
    }
  }

  IconData get icon {
    switch (this) {
      case _MigrationSource.google:
        return Icons.calendar_today_outlined;
      case _MigrationSource.apple:
        return Icons.apple_outlined;
    }
  }
}
