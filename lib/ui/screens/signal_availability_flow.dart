import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/contact.dart';
import '../../domain/enums.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/signal_providers.dart';

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

  List<Contact> _acceptedPartners = const [];

  @override
  void initState() {
    super.initState();
    final initial = widget.initialDate;
    _startDateTime = DateTime(initial.year, initial.month, initial.day, 9);
    _endDateTime = _startDateTime.add(const Duration(hours: 1));
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
            },
      selectedColor: Theme.of(context).primaryColor,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black,
      ),
      backgroundColor: Colors.grey.shade200,
    );
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

      final signal = await signalNotifier.createSignal(
        type: SignalType.available,
        duration: duration,
        message: _noteController.text.trim().isEmpty
            ? null
            : _noteController.text.trim(),
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

      await ref.read(signalsSharedWithMeProvider.notifier).refresh();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Availability shared successfully')),
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
