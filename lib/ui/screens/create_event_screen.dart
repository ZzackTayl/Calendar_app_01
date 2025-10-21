import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';
import '../../domain/availability_signal.dart';
import '../../domain/event.dart';
import '../../domain/recurrence_rule.dart';
import '../../domain/contact.dart';
import '../../domain/simple_recurrence.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/recurrence_suggestion_service.dart';
import '../widgets/contact_avatar.dart';
import '../widgets/custom_time_picker.dart';

enum _SignalConflictDecision {
  cancelSignals,
  trimSignals,
  abort,
}

/// Create Event Screen - Can be used as modal or full screen
class CreateEventScreen extends ConsumerStatefulWidget {
  final CalendarEvent? eventToEdit;
  final DateTime? initialDate;
  final String? initialTitle;
  final String? initialDescription;
  final DateTime? initialStart;
  final DateTime? initialEnd;

  const CreateEventScreen({
    super.key,
    this.eventToEdit,
    this.initialDate,
    this.initialTitle,
    this.initialDescription,
    this.initialStart,
    this.initialEnd,
  });

  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late DateTime _selectedDate;
  late DateTime _endDate;
  late TimeOfDay _startTime;
  late TimeOfDay _endTime;
  late EventPrivacyLevel _privacyLevel;
  late String _selectedCalendarId;
  final Set<String> _invitedPartnerIds = {};
  bool _isLoading = false;
  bool _isPrivacyExpanded = false; // Track if privacy section is expanded
  bool _isInviteesExpanded = false; // Track progressive disclosure for partners
  bool _isFloatingEvent =
      false; // Track if this is a floating event (e.g., daily routine)
  late final String _initialTitle;
  late final String _initialDescription;
  late final DateTime _initialSelectedDate;
  late final DateTime _initialEndDate;
  late final TimeOfDay _initialStartTime;
  late final TimeOfDay _initialEndTime;
  late final EventPrivacyLevel _initialPrivacyLevel;
  late final Set<String> _initialInvitedPartnerIds;
  late String _initialSelectedCalendarId;
  SimpleRecurrence _recurrenceSelection = SimpleRecurrence.oneOff;
  late SimpleRecurrence _initialRecurrenceSelection;
  String? _existingRecurrenceRuleId;
  SimpleRecurrence? _suggestedRecurrence;
  String? _suggestionSignature;
  int _suggestionRequestId = 0;

  @override
  void initState() {
    super.initState();

    if (widget.eventToEdit != null) {
      // Editing existing event
      final event = widget.eventToEdit!;
      _titleController = TextEditingController(text: event.title);
      _descriptionController =
          TextEditingController(text: event.description ?? '');
      _selectedDate =
          DateTime(event.start.year, event.start.month, event.start.day);
      _endDate = DateTime(event.end.year, event.end.month, event.end.day);
      _startTime = TimeOfDay.fromDateTime(event.start);
      _endTime = TimeOfDay.fromDateTime(event.end);
      _privacyLevel = event.privacyLevel;
      _invitedPartnerIds.addAll(event.invitedPartnerIds);
      _isInviteesExpanded = _invitedPartnerIds.isNotEmpty;
      _selectedCalendarId = event.calendarId;
      _isFloatingEvent = event.isFloating;
      final existingRule = event.recurrenceRule;
      if (existingRule != null) {
        _recurrenceSelection = SimpleRecurrenceX.fromRule(existingRule);
        _existingRecurrenceRuleId = existingRule.id;
      } else {
        _recurrenceSelection = SimpleRecurrence.oneOff;
      }
    } else {
      // Creating new event
      final now = DateTime.now();
      final normalizedDate = widget.initialDate != null
          ? DateTime(
              widget.initialDate!.year,
              widget.initialDate!.month,
              widget.initialDate!.day,
            )
          : DateTime(now.year, now.month, now.day);
      final startSeed = widget.initialStart ??
          DateTime(
            normalizedDate.year,
            normalizedDate.month,
            normalizedDate.day,
            now.hour,
            now.minute,
          );
      final effectiveStart = startSeed;
      final proposedEnd =
          widget.initialEnd ?? effectiveStart.add(const Duration(hours: 1));
      final effectiveEnd = proposedEnd.isAfter(effectiveStart)
          ? proposedEnd
          : effectiveStart.add(const Duration(hours: 1));

      _titleController = TextEditingController(text: widget.initialTitle ?? '');
      _descriptionController =
          TextEditingController(text: widget.initialDescription ?? '');
      _selectedDate = DateTime(
        effectiveStart.year,
        effectiveStart.month,
        effectiveStart.day,
      );
      _endDate = DateTime(
        effectiveEnd.year,
        effectiveEnd.month,
        effectiveEnd.day,
      );
      _startTime = TimeOfDay.fromDateTime(effectiveStart);
      _endTime = TimeOfDay.fromDateTime(effectiveEnd);
      _privacyLevel = EventPrivacyLevel.normal;
      _selectedCalendarId = DevDataService
          .primaryCalendarId; // Always use MyOrbit primary calendar
      _recurrenceSelection = SimpleRecurrence.oneOff;
    }

    _titleController.addListener(_handleTitleChanged);
    _initialTitle = _titleController.text.trim();
    _initialDescription = _descriptionController.text.trim();
    _initialSelectedDate = _selectedDate;
    _initialEndDate = _endDate;
    _initialStartTime = _startTime;
    _initialEndTime = _endTime;
    _initialPrivacyLevel = _privacyLevel;
    _initialInvitedPartnerIds = {..._invitedPartnerIds};
    _initialSelectedCalendarId = _selectedCalendarId;
    _initialRecurrenceSelection = _recurrenceSelection;
    if (widget.eventToEdit != null) {
      // If editing existing event, use its floating state
      _isFloatingEvent = widget.eventToEdit!.isFloating;
    }
    _suggestionSignature = _computeEventSignature();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadRecurrenceSuggestion();
    });
  }

  @override
  void dispose() {
    _titleController.removeListener(_handleTitleChanged);
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final contacts = ref.watch(connectedPartnersProvider);
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final colorScheme = theme.colorScheme;
    final labelStyle = theme.textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w700,
      color: palette.textPrimary,
    );
    final valueStyle = theme.textTheme.bodyLarge?.copyWith(
      color: palette.textPrimary,
    );
    final subtleStyle = theme.textTheme.bodyMedium?.copyWith(
      color: palette.textSecondary,
    );

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: colorScheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.eventToEdit != null ? 'Edit Event' : 'New Event',
          style: theme.textTheme.titleLarge?.copyWith(
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Event Title
                  _buildSection(
                    title: 'Event Title',
                    child: TextField(
                      controller: _titleController,
                      style: valueStyle,
                      decoration: InputDecoration(
                        hintText: 'Enter event title',
                        hintStyle: subtleStyle,
                        border: InputBorder.none,
                        contentPadding:
                            const EdgeInsets.fromLTRB(24, 16, 24, 20),
                      ),
                      textCapitalization: TextCapitalization.words,
                    ),
                  ),

                  // Description
                  _buildSection(
                    title: 'Description (Optional)',
                    child: TextField(
                      controller: _descriptionController,
                      style: valueStyle,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Add details about your event',
                        hintStyle: subtleStyle,
                        border: InputBorder.none,
                        contentPadding:
                            const EdgeInsets.fromLTRB(24, 16, 24, 20),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                    ),
                  ),

                  // Date and Time
                  Container(
                    decoration: _cardDecoration(palette),
                    padding: const EdgeInsets.all(24),
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Schedule',
                          style: labelStyle,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _buildScheduleColumn(
                                context: context,
                                heading: 'Starts',
                                dateLabel: DateFormat('EEE, MMM d, yyyy')
                                    .format(_selectedDate),
                                onSelectDate: _selectDate,
                                timeLabel: _startTime.format(context),
                                onSelectTime: () => _selectTime(isStart: true),
                                palette: palette,
                                headingStyle: labelStyle,
                                valueStyle: valueStyle,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _buildScheduleColumn(
                                context: context,
                                heading: 'Ends',
                                dateLabel: DateFormat('EEE, MMM d, yyyy')
                                    .format(_endDate),
                                onSelectDate: _selectEndDate,
                                timeLabel: _endTime.format(context),
                                onSelectTime: () => _selectTime(isStart: false),
                                palette: palette,
                                headingStyle: labelStyle,
                                valueStyle: valueStyle,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  _buildRecurrenceSection(),

                  // Invite Partners
                  if (contacts.isNotEmpty) _buildInviteSection(contacts),

                  // Floating Event Toggle
                  _buildFloatingEventToggle(),

                  // Privacy Level Section (Expandable)
                  _buildPrivacySection(),

                  // Bottom action buttons
                  const SizedBox(height: 24),
                  _buildActionButtons(),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isLoading ? null : () => _handleCancel(context),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: BorderSide(color: palette.divider),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Cancel',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
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
              backgroundColor: colorScheme.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: _isLoading
                ? SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor:
                          AlwaysStoppedAnimation<Color>(colorScheme.onPrimary),
                    ),
                  )
                : Text(
                    widget.eventToEdit != null
                        ? 'Update Event'
                        : 'Create Event',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onPrimary,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildSection({required String title, required Widget child}) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Container(
      decoration: _cardDecoration(palette),
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
            child: Text(
              title,
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: palette.textPrimary,
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }

  Widget _buildScheduleColumn({
    required BuildContext context,
    required String heading,
    required String dateLabel,
    required VoidCallback onSelectDate,
    required String timeLabel,
    required VoidCallback onSelectTime,
    required AppPalette palette,
    TextStyle? headingStyle,
    TextStyle? valueStyle,
  }) {
    final effectiveHeadingStyle = headingStyle ??
        Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          heading,
          style: effectiveHeadingStyle,
        ),
        const SizedBox(height: 12),
        _schedulePickerButton(
          icon: Icons.calendar_today,
          label: dateLabel,
          onTap: onSelectDate,
          palette: palette,
          valueStyle: valueStyle,
        ),
        const SizedBox(height: 12),
        _schedulePickerButton(
          icon: Icons.access_time,
          label: timeLabel,
          onTap: onSelectTime,
          palette: palette,
          valueStyle: valueStyle,
        ),
      ],
    );
  }

  BoxDecoration _cardDecoration(AppPalette palette) {
    final borderColor = palette.isDark
        ? AppColors.cardBorderBabyBlue
        : AppColors.cardBorderBabyBlue.withValues(alpha: 0.6);

    return BoxDecoration(
      gradient: palette.isDark
          ? const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
            )
          : null,
      color: palette.isDark ? null : Colors.white,
      border: Border.all(color: borderColor, width: 1.5),
      borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
      boxShadow: [
        if (palette.isDark)
          const BoxShadow(
            color: Color(0x55000000),
            blurRadius: 18,
            offset: Offset(0, 10),
          )
        else
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
      ],
    );
  }

  Widget _schedulePickerButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required AppPalette palette,
    TextStyle? valueStyle,
  }) {
    final backgroundColor =
        palette.isDark ? const Color(0xFF1F2330) : palette.subtleSurface;
    final borderColor = palette.isDark
        ? AppColors.cardBorderBabyBlue.withValues(alpha: 0.35)
        : AppColors.cardBorderBabyBlue.withValues(alpha: 0.25);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppBorderRadius.large),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          border: Border.all(color: borderColor, width: 1.2),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: palette.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: valueStyle,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.expand_more, size: 18, color: palette.textSecondary),
          ],
        ),
      ),
    );
  }

  Widget _buildRecurrenceSection() {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final summary = _recurrenceSelection == SimpleRecurrence.oneOff
        ? null
        : _recurrenceSummaryText();
    final suggestion = _recurrenceSelection == SimpleRecurrence.oneOff
        ? _suggestedRecurrence
        : null;

    return Container(
      decoration: _cardDecoration(palette),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Repeat',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
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
                    color: isSelected
                        ? palette.textPrimary
                        : palette.textSecondary,
                  ),
                ),
                selected: isSelected,
                onSelected: (_) => _handleRecurrenceChanged(recurrence),
                selectedColor: AppColors.eventPurple.withValues(alpha: 0.16),
                backgroundColor: palette.subtleSurface,
                side: BorderSide(
                  color: isSelected
                      ? AppColors.eventPurple.withValues(alpha: 0.6)
                      : palette.divider,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              );
            }).toList(),
          ),
          if (summary != null) ...[
            const SizedBox(height: 12),
            Text(
              summary,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: palette.textSecondary,
              ),
            ),
          ],
          if (suggestion != null) ...[
            const SizedBox(height: 12),
            _buildRecurrenceSuggestionBanner(suggestion),
          ],
        ],
      ),
    );
  }

  Widget _buildRecurrenceSuggestionBanner(SimpleRecurrence suggestion) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);

    String message;
    switch (suggestion) {
      case SimpleRecurrence.weekly:
        message =
            'Looks like you plan this around the same time each week. Repeat weekly?';
        break;
      case SimpleRecurrence.biweekly:
        message = 'We noticed this pops up every other week. Make it biweekly?';
        break;
      case SimpleRecurrence.monthly:
        message =
            'This event tends to land each month. Set it to repeat monthly?';
        break;
      case SimpleRecurrence.oneOff:
        message = '';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.badgeInfoBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: palette.badgeInfoBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.auto_awesome, color: palette.badgeInfoIcon, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Smart suggestion',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  children: [
                    FilledButton.tonal(
                      onPressed: () async {
                        await _applyRecurrenceSuggestion(suggestion);
                      },
                      child: Text('Repeat ${suggestion.label.toLowerCase()}'),
                    ),
                    TextButton(
                      onPressed: () async {
                        await _dismissRecurrenceSuggestion(suggestion);
                      },
                      child: const Text('Not now'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _recurrenceSummaryText() {
    final startDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );
    switch (_recurrenceSelection) {
      case SimpleRecurrence.oneOff:
        return '';
      case SimpleRecurrence.weekly:
        return 'Repeats every week on ${DateFormat('EEEE').format(startDateTime)}';
      case SimpleRecurrence.biweekly:
        return 'Repeats every 2 weeks on ${DateFormat('EEEE').format(startDateTime)}';
      case SimpleRecurrence.monthly:
        final day = startDateTime.day;
        final suffix = _daySuffix(day);
        return 'Repeats monthly on the $day$suffix';
    }
  }

  void _handleRecurrenceChanged(SimpleRecurrence recurrence) {
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
      _loadRecurrenceSuggestion();
    }
  }

  Future<void> _loadRecurrenceSuggestion() async {
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
        await RecurrenceSuggestionService.suggestionForEvent(signature);
    if (!mounted || requestId != _suggestionRequestId) {
      return;
    }
    setState(() {
      _suggestedRecurrence = suggestion;
    });
  }

  Future<void> _applyRecurrenceSuggestion(
    SimpleRecurrence suggestion,
  ) async {
    if (_suggestionSignature == null) return;
    _handleRecurrenceChanged(suggestion);
    await RecurrenceSuggestionService.markEventSuggestionApplied(
      _suggestionSignature!,
      suggestion,
    );
  }

  Future<void> _dismissRecurrenceSuggestion(
    SimpleRecurrence suggestion,
  ) async {
    if (_suggestionSignature == null) return;
    setState(() {
      _suggestedRecurrence = null;
    });
    await RecurrenceSuggestionService.dismissEventSuggestion(
      _suggestionSignature!,
      suggestion,
    );
  }

  void _handleTitleChanged() {
    final nextSignature = _computeEventSignature();
    if (nextSignature == _suggestionSignature) {
      return;
    }
    _suggestionSignature = nextSignature;
    if (_recurrenceSelection == SimpleRecurrence.oneOff) {
      _loadRecurrenceSuggestion();
    }
  }

  String _computeEventSignature() {
    final normalizedTitle = _titleController.text.trim().toLowerCase();
    final safeTitle = normalizedTitle.isEmpty ? 'untitled' : normalizedTitle;
    final startDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );
    return '$safeTitle|${startDateTime.weekday}|${_startTime.hour}|${_startTime.minute}';
  }

  String _daySuffix(int day) {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  Widget _buildInviteSection(List<Contact> contacts) {
    final invitedCount = _invitedPartnerIds.length;
    final subtitle = invitedCount > 0
        ? '$invitedCount connection${invitedCount == 1 ? '' : 's'} selected'
        : _isInviteesExpanded
            ? 'Choose connections to invite'
            : 'Tap to invite connections';

    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 16),
      decoration: _cardDecoration(palette),
      child: Column(
        children: [
          InkWell(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppBorderRadius.xLarge),
            ),
            onTap: () {
              setState(() {
                _isInviteesExpanded = !_isInviteesExpanded;
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Row(
                children: [
                  Icon(Icons.person_add_alt_1_outlined,
                      size: 24, color: palette.textSecondary),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Invite Connections',
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: palette.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          style: textTheme.bodySmall?.copyWith(
                            color: palette.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _isInviteesExpanded ? Icons.expand_less : Icons.expand_more,
                    color: palette.textSecondary,
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                Divider(
                  height: 1,
                  thickness: 1,
                  color: palette.divider.withValues(alpha: 0.15),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                  child: Column(
                    children: [
                      ...contacts.map((contact) => _buildPartnerTile(contact)),
                      const SizedBox(height: 12),
                      Text(
                        'Invited connections can always see event details, regardless of privacy level.',
                        style: textTheme.bodySmall?.copyWith(
                          color: palette.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ],
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

    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

    final tileBackground =
        palette.isDark ? const Color(0xFF1F2330) : palette.subtleSurface;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: tileBackground,
        borderRadius: BorderRadius.circular(AppBorderRadius.large),
        border: Border.all(
          color: palette.isDark
              ? AppColors.cardBorderBabyBlue.withValues(alpha: 0.4)
              : palette.divider.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        children: [
          ContactAvatar(
            name: contact.name,
            radius: 20,
            colorHexOverride: contact.colorHex,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              contact.name,
              style: textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
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

  Widget _buildFloatingEventToggle() {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: _cardDecoration(palette),
      child: Column(
        children: [
          InkWell(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppBorderRadius.xLarge),
            ),
            onTap: () {
              setState(() {
                _isFloatingEvent = !_isFloatingEvent;
              });
            },
            child: Container(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Icon(
                    _isFloatingEvent ? Icons.timer_outlined : Icons.timer,
                    size: 24,
                    color: _isFloatingEvent
                        ? AppColors.eventPurple
                        : palette.textSecondary,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Event Type',
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: palette.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _isFloatingEvent
                              ? 'Floating: Always at this local time (7 AM daily routine)'
                              : 'Fixed: At this absolute time (2 PM webinar)',
                          style: textTheme.bodyMedium?.copyWith(
                            color: palette.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _isFloatingEvent,
                    onChanged: (value) {
                      setState(() {
                        _isFloatingEvent = value;
                      });
                    },
                    activeThumbColor: AppColors.eventPurple,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacySection() {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: _cardDecoration(palette),
      child: Column(
        children: [
          // Privacy Level Header (Collapsible)
          InkWell(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppBorderRadius.xLarge),
            ),
            onTap: () {
              setState(() {
                _isPrivacyExpanded = !_isPrivacyExpanded;
              });
            },
            child: Container(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Icon(Icons.people_outline,
                      size: 24, color: palette.textSecondary),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Privacy Level',
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: palette.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getPrivacyLevelLabel(_privacyLevel),
                          style: textTheme.bodyMedium?.copyWith(
                            color: palette.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _isPrivacyExpanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: palette.textSecondary,
                  ),
                ],
              ),
            ),
          ),

          // Expanded Privacy Options
          if (_isPrivacyExpanded) ...[
            Divider(
              height: 1,
              thickness: 1,
              color: palette.divider.withValues(alpha: 0.15),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
              child: Column(
                children: [
                  _buildPrivacyOption(
                    level: EventPrivacyLevel.normal,
                    icon: Icons.people_outline,
                    label: 'Normal',
                    description:
                        'Visible to connections based on their individual permission levels',
                  ),
                  _buildPrivacyOption(
                    level: EventPrivacyLevel.exclusive,
                    icon: Icons.visibility,
                    label: 'Exclusive',
                    description:
                        'Only visible to explicitly invited connections, overrides individual permissions',
                  ),
                  _buildPrivacyOption(
                    level: EventPrivacyLevel.superExclusive,
                    icon: Icons.lock_outline,
                    label: 'Super Exclusive',
                    description:
                        'Completely private - not visible to anyone unless specifically invited',
                  ),
                ],
              ),
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
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    final borderColor = isSelected
        ? AppColors.eventPurple.withValues(alpha: 0.7)
        : palette.divider.withValues(alpha: 0.4);
    final backgroundColor = isSelected
        ? AppColors.eventPurple.withValues(alpha: 0.12)
        : (palette.isDark ? const Color(0xFF1F2330) : palette.subtleSurface);

    return InkWell(
      onTap: () {
        setState(() {
          _privacyLevel = level;
        });
      },
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: borderColor,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          color: backgroundColor,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 24,
              color: isSelected ? AppColors.eventPurple : palette.textSecondary,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isSelected
                          ? AppColors.eventPurple
                          : palette.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: textTheme.bodySmall?.copyWith(
                      color: palette.textSecondary,
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
        if (picked.isAfter(_endDate)) {
          _endDate = picked;
        }
        _suggestionSignature = _computeEventSignature();
      });
      _ensureEndAfterStart();
      if (_recurrenceSelection == SimpleRecurrence.oneOff) {
        _loadRecurrenceSuggestion();
      }
    }
  }

  Future<void> _selectEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate.isBefore(_selectedDate) ? _selectedDate : _endDate,
      firstDate: _selectedDate,
      lastDate: DateTime(2030),
    );

    if (picked != null && picked != _endDate) {
      setState(() {
        _endDate = picked;
      });
      _ensureEndAfterStart();
    }
  }

  Future<void> _selectTime({required bool isStart}) async {
    final picked = await showCustomTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
      title: isStart ? 'Select start time' : 'Select end time',
    );

    if (picked != null) {
      setState(() {
        if (isStart) {
          _startTime = picked;
          _suggestionSignature = _computeEventSignature();
        } else {
          _endTime = picked;
        }
      });
      if (isStart) {
        _ensureEndAfterStart();
      }
      if (isStart && _recurrenceSelection == SimpleRecurrence.oneOff) {
        _loadRecurrenceSuggestion();
      }
    }
  }

  void _ensureEndAfterStart() {
    final startDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    final endDateTime = DateTime(
      _endDate.year,
      _endDate.month,
      _endDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    if (!endDateTime.isAfter(startDateTime)) {
      final adjustedEnd = startDateTime.add(const Duration(hours: 1));
      setState(() {
        _endDate = DateTime(
          adjustedEnd.year,
          adjustedEnd.month,
          adjustedEnd.day,
        );
        _endTime = TimeOfDay.fromDateTime(adjustedEnd);
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
      _endDate.year,
      _endDate.month,
      _endDate.day,
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

    RecurrenceRule? recurrenceRule;
    if (_recurrenceSelection != SimpleRecurrence.oneOff) {
      recurrenceRule = _recurrenceSelection.buildRule(
        anchor: startDateTime,
        reuseId:
            _existingRecurrenceRuleId ?? widget.eventToEdit?.recurrenceRule?.id,
      );
      _existingRecurrenceRuleId = recurrenceRule.id;
    }

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
      calendarId: _selectedCalendarId,
      isFloating: _isFloatingEvent,
      recurrenceRule: recurrenceRule,
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

      final signature = _computeEventSignature();
      await RecurrenceSuggestionService.recordEventOccurrence(
        signature,
        startDateTime,
      );
      if (_recurrenceSelection != SimpleRecurrence.oneOff &&
          _suggestionSignature != null) {
        await RecurrenceSuggestionService.markEventSuggestionApplied(
          _suggestionSignature!,
          _recurrenceSelection,
        );
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
                        style: Theme.of(dialogContext)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppPalette.of(dialogContext).textPrimary,
                            ),
                      ),
                      if (signal.message != null && signal.message!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            signal.message!,
                            style: Theme.of(dialogContext)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: AppPalette.of(dialogContext)
                                      .textSecondary,
                                ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              if (buffer.inMinutes > 0)
                Text(
                  'Includes your ${buffer.inMinutes}-minute buffer before and after the event.',
                  style: Theme.of(dialogContext).textTheme.bodySmall?.copyWith(
                        color: AppPalette.of(dialogContext).textSecondary,
                      ),
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
    if (!_isSameDay(_endDate, _initialEndDate)) return true;
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
    if (_selectedCalendarId != _initialSelectedCalendarId) return true;
    if (_recurrenceSelection != _initialRecurrenceSelection) return true;
    if (_isFloatingEvent != widget.eventToEdit?.isFloating) return true;
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

class CalendarSelectionChip extends StatelessWidget {
  const CalendarSelectionChip({
    super.key,
    required this.label,
    required this.accentColor,
    required this.isSelected,
    required this.palette,
    required this.onTap,
    this.textStyle,
  });

  final String label;
  final Color accentColor;
  final bool isSelected;
  final AppPalette palette;
  final VoidCallback onTap;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    final resolvedTextStyle =
        (textStyle ?? Theme.of(context).textTheme.bodyMedium)?.copyWith(
      fontWeight: FontWeight.w600,
      color: isSelected ? palette.textPrimary : palette.textSecondary,
    );

    final backgroundColor = isSelected
        ? accentColor.withValues(alpha: palette.isDark ? 0.22 : 0.14)
        : palette.subtleSurface;
    final borderColor = isSelected ? accentColor : palette.divider;

    return Semantics(
      button: true,
      selected: isSelected,
      label: label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(24),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: borderColor,
                width: isSelected ? 1.6 : 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: accentColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Text(label, style: resolvedTextStyle),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
