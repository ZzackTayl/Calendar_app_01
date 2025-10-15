import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/contact.dart';
import '../../domain/enums.dart';
import '../../domain/simple_recurrence.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/recurrence_suggestion_service.dart';

enum _SignalFlowStep { partners, preferences, schedule }

enum _DurationPreset { oneHour, fourHours, day, twoDays, custom }

class SignalAvailabilityFlowScreen extends ConsumerStatefulWidget {
  const SignalAvailabilityFlowScreen({super.key, required this.initialDate});

  final DateTime initialDate;

  @override
  ConsumerState<SignalAvailabilityFlowScreen> createState() =>
      _SignalAvailabilityFlowScreenState();
}

class _SignalAvailabilityFlowScreenState
    extends ConsumerState<SignalAvailabilityFlowScreen> {
  _SignalFlowStep _step = _SignalFlowStep.partners;
  final Set<String> _selectedPartnerUserIds = {};
  final Map<String, bool> _notifyMap = {};
  final Map<String, bool> _autoAcceptMap = {};
  late DateTime _startDateTime;
  late DateTime _endDateTime;
  _DurationPreset _preset = _DurationPreset.oneHour;
  bool _keepAlive = false;
  bool _isSaving = false;
  final TextEditingController _noteController = TextEditingController();
  SimpleRecurrence _recurrenceSelection = SimpleRecurrence.oneOff;
  SimpleRecurrence? _suggestedRecurrence;
  String? _suggestionSignature;
  int _suggestionRequestId = 0;

  List<Contact> _acceptedPartners = const [];

  @override
  void initState() {
    super.initState();
    final initial = widget.initialDate;
    _startDateTime = DateTime(initial.year, initial.month, initial.day, 9);
    _endDateTime = _startDateTime.add(const Duration(hours: 1));
    _suggestionSignature = _computeSignalSignature();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadSignalSuggestion();
    });
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final partners = ref.watch(connectedPartnersProvider);
    _acceptedPartners = partners
        .where((contact) =>
            contact.status == ContactStatus.accepted &&
            contact.externalUserId != null)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Signal availability'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _buildStepIndicator(),
              const SizedBox(height: 16),
              Expanded(
                child: _buildCurrentStep(),
              ),
              const SizedBox(height: 16),
              _buildNavigation(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final steps = [
      ('Select partners', Icons.group_outlined),
      ('Preferences', Icons.tune),
      ('Schedule', Icons.calendar_month),
    ];

    final currentIndex = _step.index;

    return Row(
      children: steps.asMap().entries.map((entry) {
        final index = entry.key;
        final label = entry.value.$1;
        final icon = entry.value.$2;
        final isActive = index == currentIndex;
        final isCompleted = index < currentIndex;

        return Expanded(
          child: Column(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCompleted
                      ? Colors.green
                      : (isActive ? Colors.blue : Colors.grey.shade300),
                ),
                padding: const EdgeInsets.all(12),
                child: Icon(
                  icon,
                  size: 24,
                  color: isCompleted || isActive
                      ? Colors.white
                      : Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 8),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                style: TextStyle(
                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                  color: isActive ? Colors.blue : Colors.grey.shade600,
                ),
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildCurrentStep() {
    switch (_step) {
      case _SignalFlowStep.partners:
        return _buildPartnerSelection();
      case _SignalFlowStep.preferences:
        return _buildPartnerPreferences();
      case _SignalFlowStep.schedule:
        return _buildScheduleStep();
    }
  }

  Widget _buildPartnerSelection() {
    if (_acceptedPartners.isEmpty) {
      return const Center(
        child: Text(
          'No connected partners yet. Invite partners so you can share availability.',
          textAlign: TextAlign.center,
        ),
      );
    }

    return ListView.builder(
      itemCount: _acceptedPartners.length,
      itemBuilder: (context, index) {
        final contact = _acceptedPartners[index];
        final partnerUserId = contact.externalUserId!;
        final isSelected = _selectedPartnerUserIds.contains(partnerUserId);
        return Card(
          elevation: isSelected ? 4 : 1,
          margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
          child: InkWell(
            onTap: () {
              setState(() {
                if (isSelected) {
                  _selectedPartnerUserIds.remove(partnerUserId);
                } else {
                  _selectedPartnerUserIds.add(partnerUserId);
                }
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  Checkbox(
                    value: isSelected,
                    onChanged: (value) {
                      setState(() {
                        if (value ?? false) {
                          _selectedPartnerUserIds.add(partnerUserId);
                        } else {
                          _selectedPartnerUserIds.remove(partnerUserId);
                        }
                      });
                    },
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(contact.name,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w500)),
                        if (contact.email != null)
                          Text(contact.email!,
                              style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPartnerPreferences() {
    final partners = _acceptedPartners.where((contact) {
      final partnerUserId = contact.externalUserId;
      if (partnerUserId == null) {
        return false;
      }
      return _selectedPartnerUserIds.contains(partnerUserId);
    }).toList();

    if (partners.isEmpty) {
      return const Center(
        child: Text('Select at least one partner to continue.'),
      );
    }

    return ListView(
      children: partners.map((contact) {
        final partnerUserId = contact.externalUserId!;
        _notifyMap.putIfAbsent(partnerUserId, () => true);
        _autoAcceptMap.putIfAbsent(partnerUserId, () => false);
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  contact.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Send notification'),
                  subtitle: const Text(
                      'Alert this partner when you share availability'),
                  value: _notifyMap[partnerUserId] ?? true,
                  onChanged: (value) {
                    setState(() {
                      _notifyMap[partnerUserId] = value;
                    });
                  },
                  activeTrackColor: Theme.of(context).primaryColor,
                ),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Auto-accept requests'),
                  subtitle: const Text(
                    'Automatically accept event invitations during this window',
                  ),
                  value: _autoAcceptMap[partnerUserId] ?? false,
                  onChanged: (value) {
                    setState(() {
                      _autoAcceptMap[partnerUserId] = value;
                    });
                  },
                  activeTrackColor: Theme.of(context).primaryColor,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildScheduleStep() {
    return ListView(
      children: [
        const Text(
          'Signal window',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: [
            _buildPresetChip(_DurationPreset.oneHour, '1 hour'),
            _buildPresetChip(_DurationPreset.fourHours, '4 hours'),
            _buildPresetChip(_DurationPreset.day, '24 hours'),
            _buildPresetChip(_DurationPreset.twoDays, '48 hours'),
            _buildPresetChip(_DurationPreset.custom, 'Custom'),
          ],
        ),
        const SizedBox(height: 24),
        _buildRecurrenceSelector(),
        const SizedBox(height: 16),
        SwitchListTile.adaptive(
          title: const Text('Keep showing until I turn it off'),
          value: _keepAlive,
          onChanged: (value) {
            setState(() {
              _keepAlive = value;
              if (value) {
                _preset = _DurationPreset.custom;
              }
            });
            _refreshSignalSuggestion();
          },
          activeTrackColor: Theme.of(context).primaryColor,
        ),
        const SizedBox(height: 16),
        _buildDateTimeTile(
          label: 'Starts',
          value: _formatDateTime(_startDateTime),
          onTap: _preset == _DurationPreset.custom || !_keepAlive
              ? () => _pickStartDateTime()
              : () => _pickStartDateTime(),
        ),
        const SizedBox(height: 12),
        _buildDateTimeTile(
          label: 'Ends',
          value:
              _keepAlive ? 'Until turned off' : _formatDateTime(_endDateTime),
          enabled: !_keepAlive && _preset == _DurationPreset.custom,
          onTap: !_keepAlive && _preset == _DurationPreset.custom
              ? () => _pickEndDateTime()
              : null,
        ),
        const SizedBox(height: 24),
        const Text(
          'Optional note',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _noteController,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Add context for your partners (optional)',
            border: OutlineInputBorder(),
          ),
        ),
      ],
    );
  }

  InputChip _buildPresetChip(_DurationPreset preset, String label) {
    final isSelected = _preset == preset && !_keepAlive;
    return InputChip(
      selected: isSelected,
      label: Text(label),
      onSelected: _keepAlive
          ? null
          : (selected) {
              if (!selected) return;
              setState(() {
                _preset = preset;
                _keepAlive = false;
                _applyPreset();
              });
              _refreshSignalSuggestion();
            },
      selectedColor: Theme.of(context).primaryColor,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black,
      ),
      backgroundColor: Colors.grey.shade200,
    );
  }

  Widget _buildRecurrenceSelector() {
    final theme = Theme.of(context);
    final summary = _recurrenceSelection == SimpleRecurrence.oneOff
        ? null
        : _signalRecurrenceSummaryText();
    final suggestion = _recurrenceSelection == SimpleRecurrence.oneOff
        ? _suggestedRecurrence
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Repeat this signal',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: SimpleRecurrence.values.map((recurrence) {
            final isSelected = _recurrenceSelection == recurrence;
            return ChoiceChip(
              label: Text(
                recurrence.label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : Colors.black87,
                ),
              ),
              selected: isSelected,
              onSelected: (_) => _handleSignalRecurrenceChanged(recurrence),
              selectedColor: Theme.of(context).primaryColor,
              backgroundColor: Colors.grey.shade200,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            );
          }).toList(),
        ),
        if (summary != null) ...[
          const SizedBox(height: 8),
          Text(
            summary,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.grey.shade700,
            ),
          ),
        ],
        if (suggestion != null) ...[
          const SizedBox(height: 12),
          _buildSignalSuggestionBanner(suggestion),
        ],
      ],
    );
  }

  Widget _buildSignalSuggestionBanner(SimpleRecurrence suggestion) {
    String message;
    switch (suggestion) {
      case SimpleRecurrence.weekly:
        message =
            'You tend to share this slot each week. Make it automatic?';
        break;
      case SimpleRecurrence.biweekly:
        message =
            'This window appears every other week. Repeat it biweekly?';
        break;
      case SimpleRecurrence.monthly:
        message =
            'We noticed you signal this time monthly. Set it to auto-repeat?';
        break;
      case SimpleRecurrence.oneOff:
        message = '';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb_outline,
                  color: Colors.blue.shade600, size: 20),
              const SizedBox(width: 8),
              Text(
                'Smart suggestion',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: [
              FilledButton.tonal(
                onPressed: () async {
                  await _applySignalSuggestion(suggestion);
                },
                child: Text('Repeat ${suggestion.label.toLowerCase()}'),
              ),
              TextButton(
                onPressed: () async {
                  await _dismissSignalSuggestion(suggestion);
                },
                child: const Text('Not now'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _signalRecurrenceSummaryText() {
    switch (_recurrenceSelection) {
      case SimpleRecurrence.oneOff:
        return '';
      case SimpleRecurrence.weekly:
        return 'Will auto-schedule every week at this time.';
      case SimpleRecurrence.biweekly:
        return 'Will auto-schedule every 2 weeks at this time.';
      case SimpleRecurrence.monthly:
        return 'Will auto-schedule every month on this date.';
    }
  }

  void _handleSignalRecurrenceChanged(SimpleRecurrence recurrence) {
    if (_recurrenceSelection == recurrence) {
      return;
    }
    setState(() {
      _recurrenceSelection = recurrence;
      if (recurrence != SimpleRecurrence.oneOff) {
        _suggestedRecurrence = null;
      }
    });
    if (recurrence == SimpleRecurrence.oneOff) {
      _loadSignalSuggestion();
    }
  }

  Future<void> _loadSignalSuggestion() async {
    if (_suggestionSignature == null ||
        _recurrenceSelection != SimpleRecurrence.oneOff) {
      if (_suggestedRecurrence != null && mounted) {
        setState(() {
          _suggestedRecurrence = null;
        });
      }
      return;
    }
    final signature = _suggestionSignature!;
    final requestId = ++_suggestionRequestId;
    final suggestion =
        await RecurrenceSuggestionService.suggestionForSignal(signature);
    if (!mounted || requestId != _suggestionRequestId) {
      return;
    }
    setState(() {
      _suggestedRecurrence = suggestion;
    });
  }

  Future<void> _applySignalSuggestion(SimpleRecurrence suggestion) async {
    if (_suggestionSignature == null) return;
    _handleSignalRecurrenceChanged(suggestion);
    await RecurrenceSuggestionService.markSignalSuggestionApplied(
      _suggestionSignature!,
      suggestion,
    );
  }

  Future<void> _dismissSignalSuggestion(SimpleRecurrence suggestion) async {
    if (_suggestionSignature == null) return;
    setState(() {
      _suggestedRecurrence = null;
    });
    await RecurrenceSuggestionService.dismissSignalSuggestion(
      _suggestionSignature!,
      suggestion,
    );
  }

  void _refreshSignalSuggestion() {
    _suggestionSignature = _computeSignalSignature();
    if (_recurrenceSelection == SimpleRecurrence.oneOff) {
      _loadSignalSuggestion();
    }
  }

  String _computeSignalSignature() {
    final durationMinutes =
        _endDateTime.difference(_startDateTime).inMinutes.clamp(0, 10 * 60);
    return '${_startDateTime.weekday}|${_startDateTime.hour}|${_startDateTime.minute}|$durationMinutes';
  }

  DateTime _nextSignalStart(
    SimpleRecurrence recurrence,
    DateTime from,
  ) {
    switch (recurrence) {
      case SimpleRecurrence.oneOff:
        return from;
      case SimpleRecurrence.weekly:
        return from.add(const Duration(days: 7));
      case SimpleRecurrence.biweekly:
        return from.add(const Duration(days: 14));
      case SimpleRecurrence.monthly:
        final nextMonth = DateTime(from.year, from.month + 1, 1);
        final daysInMonth =
            DateUtils.getDaysInMonth(nextMonth.year, nextMonth.month);
        final targetDay = from.day.clamp(1, daysInMonth);
        return DateTime(
          nextMonth.year,
          nextMonth.month,
          targetDay,
          from.hour,
          from.minute,
          from.second,
        );
    }
  }

  Future<void> _scheduleRecurringSignals({
    required SimpleRecurrence recurrence,
    required Duration windowLength,
    required ActiveSignals signalNotifier,
    required SignalShares sharesNotifier,
    required List<String> partnerUserIds,
    required Map<String, bool> notifyMap,
    required Map<String, bool> autoAcceptMap,
    required SignalDuration durationPreset,
    required String? note,
    required String signature,
  }) async {
    int occurrences = switch (recurrence) {
      SimpleRecurrence.weekly => 2,
      SimpleRecurrence.biweekly => 2,
      SimpleRecurrence.monthly => 1,
      SimpleRecurrence.oneOff => 0,
    };
    if (occurrences == 0) return;

    var nextStart = _nextSignalStart(recurrence, _startDateTime);
    for (var i = 0; i < occurrences; i++) {
      if (nextStart
          .isAfter(DateTime.now().add(const Duration(days: 365)))) {
        break;
      }
      final nextEnd = _keepAlive ? null : nextStart.add(windowLength);
      final created = await signalNotifier.createSignal(
        type: SignalType.available,
        duration: durationPreset,
        message: note,
        startTime: nextStart,
        customEndTime: nextEnd,
        keepAlive: _keepAlive,
      );
      await sharesNotifier.shareSignalWithPartners(
        signalId: created.id,
        partnerIds: partnerUserIds,
        notifyMap: notifyMap,
        autoAcceptMap: autoAcceptMap,
      );
      await RecurrenceSuggestionService.recordSignalOccurrence(
        signature,
        nextStart,
      );
      nextStart = _nextSignalStart(recurrence, nextStart);
    }
  }

  Widget _buildDateTimeTile({
    required String label,
    required String value,
    VoidCallback? onTap,
    bool enabled = true,
  }) {
    return InkWell(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            Row(
              children: [
                Text(value, style: const TextStyle(fontSize: 16)),
                if (enabled) const SizedBox(width: 8),
                if (enabled)
                  const Icon(Icons.edit, size: 20, color: Colors.grey),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavigation() {
    final isFirstStep = _step == _SignalFlowStep.partners;
    final isLastStep = _step == _SignalFlowStep.schedule;

    final canGoNext = switch (_step) {
      _SignalFlowStep.partners => _selectedPartnerUserIds.isNotEmpty,
      _SignalFlowStep.preferences => _selectedPartnerUserIds.isNotEmpty,
      _SignalFlowStep.schedule => true,
    };

    return Row(
      children: [
        OutlinedButton(
          onPressed: isFirstStep || _isSaving
              ? null
              : () {
                  setState(() {
                    _step = _SignalFlowStep.values[_step.index - 1];
                  });
                },
          child: const Text('Back'),
        ),
        const Spacer(),
        ElevatedButton(
          onPressed: !canGoNext || _isSaving
              ? null
              : () async {
                  if (!isLastStep) {
                    setState(() {
                      _step = _SignalFlowStep.values[_step.index + 1];
                    });
                    return;
                  }
                  await _submit();
                },
          child: _isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(isLastStep ? 'Share availability' : 'Next'),
        ),
      ],
    );
  }

  void _applyPreset() {
    switch (_preset) {
      case _DurationPreset.oneHour:
        _endDateTime = _startDateTime.add(const Duration(hours: 1));
        break;
      case _DurationPreset.fourHours:
        _endDateTime = _startDateTime.add(const Duration(hours: 4));
        break;
      case _DurationPreset.day:
        _endDateTime = _startDateTime.add(const Duration(hours: 24));
        break;
      case _DurationPreset.twoDays:
        _endDateTime = _startDateTime.add(const Duration(hours: 48));
        break;
      case _DurationPreset.custom:
        // Leave as-is for manual editing
        break;
    }
  }

  Future<void> _pickStartDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDateTime,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (!mounted || date == null) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_startDateTime),
    );
    if (!mounted || time == null) return;

    setState(() {
      _startDateTime = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
      if (_preset != _DurationPreset.custom && !_keepAlive) {
        _applyPreset();
      } else if (_startDateTime.isAfter(_endDateTime)) {
        _endDateTime = _startDateTime.add(const Duration(hours: 1));
      }
    });
    _refreshSignalSuggestion();
  }

  Future<void> _pickEndDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endDateTime,
      firstDate: _startDateTime,
      lastDate: _startDateTime.add(const Duration(days: 365)),
    );
    if (!mounted || date == null) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_endDateTime),
    );
    if (!mounted || time == null) return;

    setState(() {
      _endDateTime = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
      if (_endDateTime.isBefore(_startDateTime)) {
        _endDateTime = _startDateTime.add(const Duration(hours: 1));
      }
    });
    _refreshSignalSuggestion();
  }

  Future<void> _submit() async {
    setState(() {
      _isSaving = true;
    });

    try {
      final signalNotifier = ref.read(activeSignalsProvider.notifier);

      final duration = switch (_preset) {
        _DurationPreset.oneHour => SignalDuration.hour,
        _DurationPreset.fourHours => SignalDuration.hours4,
        _DurationPreset.day => SignalDuration.day,
        _DurationPreset.twoDays => SignalDuration.custom,
        _DurationPreset.custom => SignalDuration.custom,
      };

      final customEnd = _keepAlive
          ? null
          : switch (_preset) {
              _DurationPreset.custom => _endDateTime,
              _DurationPreset.twoDays =>
                _startDateTime.add(const Duration(hours: 48)),
              _ => null,
            };

      final note = _noteController.text.trim().isEmpty
          ? null
          : _noteController.text.trim();
      final signal = await signalNotifier.createSignal(
        type: SignalType.available,
        duration: duration,
        message: note,
        startTime: _startDateTime,
        customEndTime:
            _preset == _DurationPreset.custom ? _endDateTime : customEnd,
        keepAlive: _keepAlive,
      );

      final sharesNotifier = ref.read(signalSharesProvider.notifier);
      final partnerUserIds = _selectedPartnerUserIds.toList();
      final selectedNotifyMap = {
        for (final id in partnerUserIds) id: _notifyMap[id] ?? true,
      };
      final selectedAutoAcceptMap = {
        for (final id in partnerUserIds) id: _autoAcceptMap[id] ?? false,
      };

      await sharesNotifier.shareSignalWithPartners(
        signalId: signal.id,
        partnerIds: partnerUserIds,
        notifyMap: selectedNotifyMap,
        autoAcceptMap: selectedAutoAcceptMap,
      );

      final signature = _computeSignalSignature();
      await RecurrenceSuggestionService.recordSignalOccurrence(
        signature,
        _startDateTime,
      );
      final shouldRepeat =
          _recurrenceSelection != SimpleRecurrence.oneOff && !_keepAlive;
      if (shouldRepeat) {
        final windowLength = _endDateTime.difference(_startDateTime);
        await _scheduleRecurringSignals(
          recurrence: _recurrenceSelection,
          windowLength: windowLength,
          signalNotifier: signalNotifier,
          sharesNotifier: sharesNotifier,
          partnerUserIds: partnerUserIds,
          notifyMap: selectedNotifyMap,
          autoAcceptMap: selectedAutoAcceptMap,
          durationPreset: duration,
          note: note,
          signature: signature,
        );
        if (_suggestionSignature != null) {
          await RecurrenceSuggestionService.markSignalSuggestionApplied(
            _suggestionSignature!,
            _recurrenceSelection,
          );
        }
      }

      await ref.read(signalsSharedWithMeProvider.notifier).refresh();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(shouldRepeat
              ? 'Availability shared and future repeats scheduled.'
              : 'Availability shared successfully'),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to share availability: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  String _formatDateTime(DateTime value) {
    final date = DateFormat('EEE, MMM d').format(value);
    final time = DateFormat('h:mm a').format(value);
    return '$time • $date';
  }
}
