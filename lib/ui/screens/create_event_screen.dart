import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/supabase_client.dart';
import '../../domain/availability_signal.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/dev_data_service.dart';

enum _SignalConflictDecision {
  cancelSignals,
  trimSignals,
  abort,
}

/// Create Event Screen - Can be used as modal or full screen
class CreateEventScreen extends ConsumerStatefulWidget {
  final CalendarEvent? eventToEdit;
  final DateTime? initialDate;

  const CreateEventScreen({
    super.key,
    this.eventToEdit,
    this.initialDate,
  });

  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late DateTime _selectedDate;
  late TimeOfDay _startTime;
  late TimeOfDay _endTime;
  late EventPrivacyLevel _privacyLevel;
  final Set<String> _invitedPartnerIds = {};
  bool _isLoading = false;
  bool _isPrivacyExpanded = false; // Track if privacy section is expanded
  bool _isInviteesExpanded = false; // Track progressive disclosure for partners
  late final String _initialTitle;
  late final String _initialDescription;
  late final DateTime _initialSelectedDate;
  late final TimeOfDay _initialStartTime;
  late final TimeOfDay _initialEndTime;
  late final EventPrivacyLevel _initialPrivacyLevel;
  late final Set<String> _initialInvitedPartnerIds;

  @override
  void initState() {
    super.initState();

    if (widget.eventToEdit != null) {
      // Editing existing event
      final event = widget.eventToEdit!;
      _titleController = TextEditingController(text: event.title);
      _descriptionController =
          TextEditingController(text: event.description ?? '');
      _selectedDate = event.start;
      _startTime = TimeOfDay.fromDateTime(event.start);
      _endTime = TimeOfDay.fromDateTime(event.end);
      _privacyLevel = event.privacyLevel;
      _invitedPartnerIds.addAll(event.invitedPartnerIds);
      _isInviteesExpanded = _invitedPartnerIds.isNotEmpty;
    } else {
      // Creating new event
      final now = DateTime.now();
      final initialDate = widget.initialDate ??
          DateTime(now.year, now.month, now.day); // normalize to date boundary
      _titleController = TextEditingController();
      _descriptionController = TextEditingController();
      _selectedDate = initialDate;
      _startTime = TimeOfDay.fromDateTime(now);

      final defaultEnd = now.add(const Duration(hours: 1));
      if (defaultEnd.day != now.day) {
        _endTime = const TimeOfDay(hour: 23, minute: 59);
      } else {
        _endTime = TimeOfDay.fromDateTime(defaultEnd);
      }
      _privacyLevel = EventPrivacyLevel.normal;
    }

    _initialTitle = _titleController.text.trim();
    _initialDescription = _descriptionController.text.trim();
    _initialSelectedDate = _selectedDate;
    _initialStartTime = _startTime;
    _initialEndTime = _endTime;
    _initialPrivacyLevel = _privacyLevel;
    _initialInvitedPartnerIds = {..._invitedPartnerIds};
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final contacts = ref.watch(connectedPartnersProvider);
    final isKeyboardVisible = MediaQuery.of(context).viewInsets.bottom > 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.eventToEdit != null ? 'Edit Event' : 'New Event',
          style: const TextStyle(
            color: Colors.black,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: EdgeInsets.only(
              bottom: isKeyboardVisible ? 80 : 100,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Event Title
                _buildSection(
                  title: 'Event Title',
                  child: TextField(
                    controller: _titleController,
                    style: const TextStyle(fontSize: 16),
                    decoration: const InputDecoration(
                      hintText: 'Enter event title',
                      hintStyle: TextStyle(color: Color(0xFF9CA3AF)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.all(16),
                    ),
                    textCapitalization: TextCapitalization.words,
                  ),
                ),

                // Description
                _buildSection(
                  title: 'Description (Optional)',
                  child: TextField(
                    controller: _descriptionController,
                    style: const TextStyle(fontSize: 16),
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Add details about your event',
                      hintStyle: TextStyle(color: Color(0xFF9CA3AF)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.all(16),
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                ),

                // Date and Time
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    children: [
                      // Date
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Date',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: _selectDate,
                              child: Row(
                                children: [
                                  Text(
                                    DateFormat('M/d/yyyy')
                                        .format(_selectedDate),
                                    style: const TextStyle(
                                      fontSize: 16,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.calendar_today, size: 20),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Start Time
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Start',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => _selectTime(isStart: true),
                              child: Row(
                                children: [
                                  Text(
                                    _startTime.format(context),
                                    style: const TextStyle(
                                      fontSize: 16,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.access_time, size: 20),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      // End Time
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'End',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => _selectTime(isStart: false),
                              child: Row(
                                children: [
                                  Text(
                                    _endTime.format(context),
                                    style: const TextStyle(
                                      fontSize: 16,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.access_time, size: 20),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Invite Partners
                if (contacts.isNotEmpty) _buildInviteSection(contacts),

                // Privacy Level Section (Expandable)
                _buildPrivacySection(),
              ],
            ),
          ),

          // Bottom action buttons
          if (!isKeyboardVisible)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed:
                            _isLoading ? null : () => _handleCancel(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          side: const BorderSide(color: Color(0xFFE5E7EB)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveEvent,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: const Color(0xFF1F2C3E),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white),
                                ),
                              )
                            : Text(
                                widget.eventToEdit != null
                                    ? 'Update Event'
                                    : 'Create Event',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSection({required String title, required Widget child}) {
    return Container(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.black,
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }

  Widget _buildInviteSection(List<Contact> contacts) {
    final invitedCount = _invitedPartnerIds.length;
    final subtitle = invitedCount > 0
        ? '$invitedCount partner${invitedCount == 1 ? '' : 's'} selected'
        : _isInviteesExpanded
            ? 'Choose partners to invite'
            : 'Tap to invite partners';

    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 16),
      color: Colors.white,
      child: Column(
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _isInviteesExpanded = !_isInviteesExpanded;
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                children: [
                  const Icon(Icons.person_add_alt_1_outlined, size: 24),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Invite Partners',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF9CA3AF),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _isInviteesExpanded ? Icons.expand_less : Icons.expand_more,
                    color: Colors.black54,
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                const Divider(
                  height: 1,
                  thickness: 1,
                  color: Color(0xFFE5E7EB),
                ),
                ...contacts.map((contact) => _buildPartnerTile(contact)),
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Text(
                    'Invited partners can always see event details, regardless of privacy level.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFF9CA3AF),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
            crossFadeState: _isInviteesExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
            sizeCurve: Curves.easeInOut,
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerTile(Contact contact) {
    final isInvited = _invitedPartnerIds.contains(contact.id);

    // Determine avatar color
    Color avatarColor;
    if (contact.name.toLowerCase().startsWith('a')) {
      avatarColor = const Color(0xFF7C6FD6); // Purple
    } else if (contact.name.toLowerCase().startsWith('s')) {
      avatarColor = const Color(0xFFE89C4B); // Orange
    } else if (contact.name.toLowerCase().startsWith('j')) {
      avatarColor = const Color(0xFF5AC18E); // Green
    } else {
      avatarColor = const Color(0xFF7C6FD6); // Default purple
    }

    // Get permission icon
    IconData permissionIcon;
    Color permissionColor;
    switch (contact.permission) {
      case PartnerPermission.visible:
        permissionIcon = Icons.visibility;
        permissionColor = const Color(0xFF4CAF50);
        break;
      case PartnerPermission.semiVisible:
        permissionIcon = Icons.remove;
        permissionColor = const Color(0xFFF59E0B);
        break;
      case PartnerPermission.private:
        permissionIcon = Icons.visibility_off;
        permissionColor = const Color(0xFFEF4444);
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: Colors.white,
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: avatarColor,
            child: Text(
              contact.name[0].toUpperCase(),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              contact.name,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
          Icon(
            permissionIcon,
            size: 20,
            color: permissionColor,
          ),
          const SizedBox(width: 16),
          Switch(
            value: isInvited,
            onChanged: (value) {
              setState(() {
                if (value) {
                  _invitedPartnerIds.add(contact.id);
                } else {
                  _invitedPartnerIds.remove(contact.id);
                }
              });
            },
            activeTrackColor: const Color(0xFF4CAF50),
            activeThumbColor: Colors.white,
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacySection() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      color: Colors.white,
      child: Column(
        children: [
          // Privacy Level Header (Collapsible)
          InkWell(
            onTap: () {
              setState(() {
                _isPrivacyExpanded = !_isPrivacyExpanded;
              });
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.people_outline, size: 24),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Privacy Level',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getPrivacyLevelLabel(_privacyLevel),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _isPrivacyExpanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: const Color(0xFF9CA3AF),
                  ),
                ],
              ),
            ),
          ),

          // Expanded Privacy Options
          if (_isPrivacyExpanded) ...[
            _buildPrivacyOption(
              level: EventPrivacyLevel.normal,
              icon: Icons.people_outline,
              label: 'Normal',
              description:
                  'Visible to partners based on their individual permission levels',
            ),
            _buildPrivacyOption(
              level: EventPrivacyLevel.exclusive,
              icon: Icons.visibility,
              label: 'Exclusive',
              description:
                  'Only visible to explicitly invited partners, overrides individual permissions',
            ),
            _buildPrivacyOption(
              level: EventPrivacyLevel.superExclusive,
              icon: Icons.lock_outline,
              label: 'Super Exclusive',
              description:
                  'Completely private - not visible to anyone unless specifically invited',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPrivacyOption({
    required EventPrivacyLevel level,
    required IconData icon,
    required String label,
    required String description,
  }) {
    final isSelected = _privacyLevel == level;

    return InkWell(
      onTap: () {
        setState(() {
          _privacyLevel = level;
        });
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color:
                isSelected ? const Color(0xFF7C3BFF) : const Color(0xFFE5E7EB),
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isSelected ? const Color(0xFFF3F0FF) : Colors.white,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 24,
              color: isSelected ? const Color(0xFF7C3BFF) : Colors.black87,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color:
                          isSelected ? const Color(0xFF7C3BFF) : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF6B7280),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getPrivacyLevelLabel(EventPrivacyLevel level) {
    switch (level) {
      case EventPrivacyLevel.normal:
        return 'Normal';
      case EventPrivacyLevel.exclusive:
        return 'Exclusive';
      case EventPrivacyLevel.superExclusive:
        return 'Super Exclusive';
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _selectTime({required bool isStart}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  Future<void> _saveEvent() async {
    // Validate
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an event title')),
      );
      return;
    }

    final startDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    final endDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    if (!endDateTime.isAfter(startDateTime)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('End time must be after the start time'),
        ),
      );
      return;
    }

    final conflictsCleared = await _resolveSignalConflicts(
      startDateTime,
      endDateTime,
    );
    if (!mounted) {
      return;
    }
    if (!conflictsCleared) {
      return;
    }

    // Build candidate event
    final ownerId = widget.eventToEdit?.ownerId ??
        SupabaseService.currentUser?.id ??
        DevDataService.currentUserId;

    final event = CalendarEvent(
      id: widget.eventToEdit?.id ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      start: startDateTime,
      end: endDateTime,
      privacyLevel: _privacyLevel,
      invitedPartnerIds: _invitedPartnerIds.toList(),
      ownerId: ownerId,
    );

    if (widget.eventToEdit != null && _hasUnsavedChanges()) {
      final confirmed = await _showConfirmationDialog(
        context,
        title: 'Confirm Update',
        message:
            'You\'re about to update "${event.title}". Do you want to review before saving these changes?',
        confirmLabel: 'Update',
      );
      if (!mounted) {
        return;
      }
      if (!confirmed) {
        return;
      }
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final eventListNotifier = ref.read(eventListProvider.notifier);

      if (widget.eventToEdit != null) {
        await eventListNotifier.updateEvent(event);
      } else {
        await eventListNotifier.addEvent(event);
      }

      if (mounted) {
        Navigator.of(context).pop(true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving event: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<bool> _resolveSignalConflicts(
    DateTime eventStart,
    DateTime eventEnd,
  ) async {
    List<AvailabilitySignal> signals;
    try {
      signals = await ref.read(activeSignalsProvider.future);
    } catch (_) {
      return true;
    }

    if (signals.isEmpty) {
      return true;
    }

    if (!mounted) {
      return false;
    }

    final settingsAsync = ref.read(settingsControllerProvider);
    final settings = settingsAsync.asData?.value ?? const SettingsState();
    final buffer = Duration(minutes: settings.signalBufferMinutes);

    final bufferedStart = eventStart.subtract(buffer);
    final bufferedEnd = eventEnd.add(buffer);

    final overlappingSignals = signals.where((signal) {
      return signal.endTime.isAfter(bufferedStart) &&
          signal.startTime.isBefore(bufferedEnd);
    }).toList();

    if (overlappingSignals.isEmpty) {
      return true;
    }

    final decision = await showDialog<_SignalConflictDecision>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Availability signal conflict'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'You already shared availability during this time. What would you like to do?',
              ),
              const SizedBox(height: 16),
              ...overlappingSignals.map(
                (signal) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _formatSignalWindow(signal),
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (signal.message != null && signal.message!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            signal.message!,
                            style: const TextStyle(color: Color(0xFF6B7280)),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              if (buffer.inMinutes > 0)
                Text(
                  'Includes your ${buffer.inMinutes}-minute buffer before and after the event.',
                  style: const TextStyle(color: Color(0xFF6B7280)),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext)
                  .pop(_SignalConflictDecision.abort),
              child: const Text('Go back'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext)
                  .pop(_SignalConflictDecision.trimSignals),
              child: const Text('Trim signal'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext)
                  .pop(_SignalConflictDecision.cancelSignals),
              child: const Text('Cancel signal'),
            ),
          ],
        );
      },
    );

    if (!mounted) {
      return false;
    }

    if (decision == null || decision == _SignalConflictDecision.abort) {
      return false;
    }

    final notifier = ref.read(activeSignalsProvider.notifier);
    if (decision == _SignalConflictDecision.cancelSignals) {
      for (final signal in overlappingSignals) {
        await notifier.cancelSignal(signal);
      }
    } else if (decision == _SignalConflictDecision.trimSignals) {
      for (final signal in overlappingSignals) {
        await notifier.trimSignalForEvent(
          signal,
          eventStart,
          eventEnd,
          buffer,
        );
      }
    }

    return true;
  }

  String _formatSignalWindow(AvailabilitySignal signal) {
    final dateFormat = DateFormat('EEE, MMM d');
    final timeFormat = DateFormat('h:mm a');
    final startDate = dateFormat.format(signal.startTime);
    final endDate = dateFormat.format(signal.endTime);
    final sameDay = startDate == endDate;
    final startLabel = '${timeFormat.format(signal.startTime)} • $startDate';
    final endLabel = sameDay
        ? timeFormat.format(signal.endTime)
        : '${timeFormat.format(signal.endTime)} • $endDate';
    return '$startLabel → $endLabel';
  }

  Future<void> _handleCancel(BuildContext context) async {
    if (!_hasUnsavedChanges()) {
      Navigator.of(context).pop();
      return;
    }

    final isEditing = widget.eventToEdit != null;
    final confirmed = await _showConfirmationDialog(
      context,
      title: isEditing ? 'Discard Updates?' : 'Discard Event?',
      message: isEditing
          ? 'You have unsaved changes to "${widget.eventToEdit!.title}". Do you want to discard them?'
          : 'Discard this draft event? Any details you entered will be lost.',
      confirmLabel: 'Discard',
    );

    if (confirmed) {
      if (context.mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  bool _hasUnsavedChanges() {
    if (_titleController.text.trim() != _initialTitle) return true;
    if (_descriptionController.text.trim() != _initialDescription) return true;
    if (!_isSameDay(_selectedDate, _initialSelectedDate)) return true;
    if (_startTime.hour != _initialStartTime.hour ||
        _startTime.minute != _initialStartTime.minute) {
      return true;
    }
    if (_endTime.hour != _initialEndTime.hour ||
        _endTime.minute != _initialEndTime.minute) {
      return true;
    }
    if (_privacyLevel != _initialPrivacyLevel) return true;
    final currentInvites = Set<String>.from(_invitedPartnerIds);
    if (currentInvites.length != _initialInvitedPartnerIds.length) {
      return true;
    }
    if (!currentInvites.containsAll(_initialInvitedPartnerIds)) {
      return true;
    }
    return false;
  }

  Future<bool> _showConfirmationDialog(
    BuildContext context, {
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Go Back'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
