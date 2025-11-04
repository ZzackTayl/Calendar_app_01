import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:myorbit_calendar/core/enums/app_state_status.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/domain/calendar_migration.dart';
import 'package:myorbit_calendar/features/external_calendar/presentation/cubit/calendar_migration_cubit.dart';
import 'package:myorbit_calendar/ui/widgets/app_gradient_background.dart';

enum _MigrationSource { google, apple }

class CalendarMigrationScreen extends StatefulWidget {
  const CalendarMigrationScreen({super.key});

  @override
  State<CalendarMigrationScreen> createState() =>
      _CalendarMigrationScreenState();
}

class _CalendarMigrationScreenState extends State<CalendarMigrationScreen> {
  int _currentStep = 0;
  _MigrationSource _source = _MigrationSource.google;
  bool _includePastEvents = false;
  bool _includeSharedCalendars = true;
  bool _mergeDuplicates = true;
  bool _notifyPartners = true;
  bool _isSubmitting = false;

  void _handleContinue() {
    if (_currentStep == 2) {
      _startMigration();
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

  Future<void> _startMigration() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      final migrationCubit = context.read<CalendarMigrationCubit>();

      if (_source == _MigrationSource.google) {
        await migrationCubit.importFromGoogle(
          includePastEvents: _includePastEvents,
        );
      } else {
        await migrationCubit.importFromApple(
          includePastEvents: _includePastEvents,
        );
      }

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      final state = migrationCubit.state;

      if (state.status.isSuccess) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                'Successfully imported ${state.importedCount} events from ${_source.label}!',
              ),
              backgroundColor: Colors.green,
            ),
          );
        Navigator.of(context).pop();
      } else if (state.status.isFailure) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);

      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('Import failed: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        title: const Text('Import Calendar Data'),
        actions: [
          IconButton(
            tooltip: 'Refresh history',
            onPressed: () =>
                context.read<CalendarMigrationCubit>().loadMigrationHistory(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: AppGradientBackground(
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: BlocBuilder<CalendarMigrationCubit, CalendarMigrationState>(
            builder: (context, migrationState) {
              return Column(
                children: [
                  Expanded(
                    child: Stepper(
                      currentStep: _currentStep,
                      onStepContinue: _isSubmitting ? null : _handleContinue,
                      onStepCancel: _isSubmitting ? null : _handleBack,
                      controlsBuilder: (context, details) {
                        final isLastStep = _currentStep == 2;
                        return Row(
                          children: [
                            FilledButton(
                              onPressed:
                                  _isSubmitting ? null : details.onStepContinue,
                              child: _isSubmitting && isLastStep
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : Text(
                                      isLastStep ? 'Start import' : 'Continue'),
                            ),
                            const SizedBox(width: 12),
                            TextButton(
                              onPressed:
                                  _isSubmitting ? null : details.onStepCancel,
                              child:
                                  Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                            ),
                          ],
                        );
                      },
                      steps: [
                        _buildChooseSourceStep(context, palette),
                        _buildMatchCalendarsStep(context, palette),
                        _buildReviewChangesStep(context, palette),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    child: _MigrationHistoryCard(
                        migrationHistory: migrationState.migrationHistory),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Step _buildChooseSourceStep(BuildContext context, AppPalette palette) {
    return Step(
      title: const Text('Choose a source'),
      isActive: _currentStep >= 0,
      state: _currentStep > 0 ? StepState.complete : StepState.indexed,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Connect to another calendar service to copy events into MyOrbit.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: palette.textSecondary,
                ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<_MigrationSource>(
            value: _source,
            decoration: const InputDecoration(labelText: 'Calendar provider'),
            items: _MigrationSource.values
                .map(
                  (source) => DropdownMenuItem(
                    value: source,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(source.icon, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Flexible(child: Text(source.label)),
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
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: palette.textSecondary,
                ),
          ),
        ],
      ),
    );
  }

  Step _buildMatchCalendarsStep(BuildContext context, AppPalette palette) {
    return Step(
      title: const Text('Match calendars'),
      isActive: _currentStep >= 1,
      state: _currentStep > 1 ? StepState.complete : StepState.indexed,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Pick what to bring over. You can review everything before anything goes live.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: palette.textSecondary,
                ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            title: const Text('Include events from the past 12 months'),
            value: _includePastEvents,
            onChanged: (value) => setState(() => _includePastEvents = value),
          ),
          SwitchListTile(
            title: const Text('Import shared calendars'),
            subtitle: const Text('We\'ll respect privacy settings.'),
            value: _includeSharedCalendars,
            onChanged: (value) =>
                setState(() => _includeSharedCalendars = value),
          ),
          SwitchListTile(
            title: const Text('Merge duplicates automatically'),
            value: _mergeDuplicates,
            onChanged: (value) => setState(() => _mergeDuplicates = value),
          ),
          SwitchListTile(
            title: const Text('Notify partners about imported events'),
            value: _notifyPartners,
            onChanged: (value) => setState(() => _notifyPartners = value),
          ),
        ],
      ),
    );
  }

  Step _buildReviewChangesStep(BuildContext context, AppPalette palette) {
    return Step(
      title: const Text('Review changes'),
      isActive: _currentStep >= 2,
      state: StepState.indexed,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'We\'ll generate a migration report when the import finishes.',
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
                    'Summary',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  _buildSummaryRow('Source', _source.label),
                  _buildSummaryRow(
                    'Past events',
                    _includePastEvents ? 'Last 12 months' : 'Upcoming only',
                  ),
                  _buildSummaryRow(
                    'Shared calendars',
                    _includeSharedCalendars ? 'Included' : 'Skipped',
                  ),
                  _buildSummaryRow(
                    'Merge duplicates',
                    _mergeDuplicates ? 'Enabled' : 'Disabled',
                  ),
                  _buildSummaryRow(
                    'Notify partners',
                    _notifyPartners ? 'Enabled' : 'Disabled',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _MigrationHistoryCard extends StatelessWidget {
  const _MigrationHistoryCard({required this.migrationHistory});

  final List<CalendarMigrationRecord> migrationHistory;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    if (migrationHistory.isEmpty) {
      return Card(
        elevation: 0,
        color: palette.subtleSurface,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Migration history',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              Text(
                'No imports yet. Start your first migration to see progress here.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: palette.textSecondary,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 0,
      color: palette.subtleSurface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent imports',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            ...migrationHistory.take(4).map(
                  (record) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _MigrationHistoryRow(record: record),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _MigrationHistoryRow extends StatelessWidget {
  const _MigrationHistoryRow({required this.record});

  final CalendarMigrationRecord record;

  Color _statusColor(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    switch (record.status) {
      case CalendarMigrationStatus.completed:
        return scheme.primary;
      case CalendarMigrationStatus.failed:
        return scheme.error;
      case CalendarMigrationStatus.processing:
        return scheme.tertiary;
      case CalendarMigrationStatus.unknown:
        return AppColors.textSecondary;
    }
  }

  IconData _statusIcon() {
    switch (record.status) {
      case CalendarMigrationStatus.completed:
        return Icons.check_circle;
      case CalendarMigrationStatus.failed:
        return Icons.error_outline;
      case CalendarMigrationStatus.processing:
        return Icons.sync;
      case CalendarMigrationStatus.unknown:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final timestamp = record.createdAt;
    final completed = record.completedAt;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          _statusIcon(),
          color: _statusColor(context),
          size: 20,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${record.source} • ${record.status.label}',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                'Started ${_formatTimestamp(timestamp)}'
                '${completed != null ? ' • Completed ${_formatTimestamp(completed)}' : ''}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: palette.textSecondary,
                    ),
              ),
              if (record.errorMessage != null) ...[
                const SizedBox(height: 4),
                Text(
                  record.errorMessage!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.error,
                      ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.month}/${timestamp.day}/${timestamp.year}';
    }
  }
}

extension on _MigrationSource {
  String get label {
    switch (this) {
      case _MigrationSource.google:
        return 'Google Calendar';
      case _MigrationSource.apple:
        return 'Apple Calendar';
    }
  }

  String get subtitle {
    switch (this) {
      case _MigrationSource.google:
        return 'Requires Google OAuth. We import your calendars securely.';
      case _MigrationSource.apple:
        return 'Requires Apple Calendar export (.ics) for now.';
    }
  }

  IconData get icon {
    switch (this) {
      case _MigrationSource.google:
        return Icons.calendar_today;
      case _MigrationSource.apple:
        return Icons.apple;
    }
  }
}
