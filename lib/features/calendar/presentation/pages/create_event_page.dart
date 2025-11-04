import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/recurrence_rule.dart';
import 'package:myorbit_calendar/domain/simple_recurrence.dart';
import 'package:myorbit_calendar/features/contacts/domain/entities/contact.dart';
import 'package:myorbit_calendar/features/contacts/presentation/cubit/contact_cubit.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';
import 'package:myorbit_calendar/logic/services/recurrence_suggestion_service.dart';
import 'package:myorbit_calendar/ui/widgets/app_gradient_background.dart';

/// Create Event Screen - BLoC version
class CreateEventScreen extends StatefulWidget {
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
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}


class _CreateEventScreenState extends State<CreateEventScreen> {
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
  bool _isFloatingEvent = false;
  SimpleRecurrence _recurrenceSelection = SimpleRecurrence.oneOff;
  String? _existingRecurrenceRuleId;
  SimpleRecurrence? _suggestedRecurrence;
  String? _suggestionSignature;
  int _suggestionRequestId = 0;

  @override
  void initState() {
    super.initState();
    _initializeFields();
    _titleController.addListener(_handleTitleChanged);
    _suggestionSignature = _computeEventSignature();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadRecurrenceSuggestion();
    });
  }

  void _initializeFields() {
    if (widget.eventToEdit != null) {
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
      _selectedCalendarId = event.calendarId;
      _isFloatingEvent = event.isFloating;
      final existingRule = event.recurrenceRule;
      if (existingRule != null) {
        _recurrenceSelection = SimpleRecurrenceX.fromRule(existingRule);
        _existingRecurrenceRuleId = existingRule.id;
      }
    } else {
      final now = DateTime.now();
      final normalizedDate = widget.initialDate ??
          DateTime(now.year, now.month, now.day);
      final startSeed = widget.initialStart ??
          DateTime(
            normalizedDate.year,
            normalizedDate.month,
            normalizedDate.day,
            now.hour,
            now.minute,
          );
      final effectiveEnd = (widget.initialEnd ?? startSeed.add(const Duration(hours: 1)));

      _titleController = TextEditingController(text: widget.initialTitle ?? '');
      _descriptionController =
          TextEditingController(text: widget.initialDescription ?? '');
      _selectedDate = DateTime(
        startSeed.year,
        startSeed.month,
        startSeed.day,
      );
      _endDate = DateTime(
        effectiveEnd.year,
        effectiveEnd.month,
        effectiveEnd.day,
      );
      _startTime = TimeOfDay.fromDateTime(startSeed);
      _endTime = TimeOfDay.fromDateTime(effectiveEnd);
      _privacyLevel = EventPrivacyLevel.normal;
      _selectedCalendarId = DevDataService.primaryCalendarId;
    }
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
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: palette.chevronColor),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Close create event screen',
        ),
        title: Text(
          widget.eventToEdit != null ? 'Edit Event' : 'New Event',
          style: theme.textTheme.titleLarge?.copyWith(
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: AppGradientBackground(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTitleSection(theme, palette),
                    _buildDescriptionSection(theme, palette),
                    _buildScheduleSection(context, theme, palette),
                    _buildRecurrenceSection(theme, palette),
                    _buildInviteSection(context),
                    _buildFloatingEventToggle(theme, palette),
                    _buildPrivacySection(theme, palette),
                    const SizedBox(height: 24),
                    _buildActionButtons(theme, palette, colorScheme),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTitleSection(ThemeData theme, AppPalette palette) {
    return _buildSection(
      title: 'Event Title',
      palette: palette,
      theme: theme,
      child: TextField(
        controller: _titleController,
        style: theme.textTheme.bodyLarge?.copyWith(
          color: palette.textPrimary,
        ),
        decoration: InputDecoration(
          hintText: 'Enter event title',
          hintStyle: theme.textTheme.bodyMedium?.copyWith(
            color: palette.textSecondary,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
        ),
        textCapitalization: TextCapitalization.words,
      ),
    );
  }

  Widget _buildDescriptionSection(ThemeData theme, AppPalette palette) {
    return _buildSection(
      title: 'Description (Optional)',
      palette: palette,
      theme: theme,
      child: TextField(
        controller: _descriptionController,
        style: theme.textTheme.bodyLarge?.copyWith(
          color: palette.textPrimary,
        ),
        maxLines: 3,
        decoration: InputDecoration(
          hintText: 'Add details about your event',
          hintStyle: theme.textTheme.bodyMedium?.copyWith(
            color: palette.textSecondary,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
        ),
        textCapitalization: TextCapitalization.sentences,
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required Widget child,
    required AppPalette palette,
    required ThemeData theme,
  }) {
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
              style: theme.textTheme.titleMedium?.copyWith(
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


  Widget _buildScheduleSection(
    BuildContext context,
    ThemeData theme,
    AppPalette palette,
  ) {
    final startDateLabel = DateFormat('EEE, MMM d, yyyy').format(_selectedDate);
    final endDateLabel = DateFormat('EEE, MMM d, yyyy').format(_endDate);
    final startTimeLabel = _startTime.format(context);
    final endTimeLabel = _endTime.format(context);
    final summary =
        '$startDateLabel · $startTimeLabel → $endDateLabel · $endTimeLabel';

    return Container(
      decoration: _cardDecoration(palette),
      padding: const EdgeInsets.all(24),
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Schedule',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            decoration: BoxDecoration(
              color: palette.isDark
                  ? palette.surfaceVariant
                  : palette.subtleSurface,
              borderRadius: BorderRadius.circular(AppBorderRadius.large),
              border: Border.all(
                color: palette.chevronColor
                    .withValues(alpha: palette.isDark ? 0.45 : 0.25),
                width: 1.2,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.schedule, size: 20, color: palette.chevronColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    summary,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: palette.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _selectDate(),
                  icon: Icon(Icons.edit, size: 18, color: palette.chevronColor),
                  label: const Text('Edit start'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _selectEndDate(),
                  icon: Icon(Icons.edit, size: 18, color: palette.chevronColor),
                  label: const Text('Edit end'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecurrenceSection(ThemeData theme, AppPalette palette) {
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
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildInviteSection(BuildContext context) {
    final contactState = context.watch<ContactCubit>().state;
    final connectedContacts = contactState.contacts
        .where((c) => c.status == ContactStatus.accepted)
        .toList();

    if (connectedContacts.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final palette = AppPalette.of(context);

    return Container(
      decoration: _cardDecoration(palette),
      padding: const EdgeInsets.all(24),
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Invite Partners',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: connectedContacts.map((contact) {
              final isInvited = _invitedPartnerIds.contains(contact.id);
              return FilterChip(
                label: Text(contact.name),
                selected: isInvited,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _invitedPartnerIds.add(contact.id);
                    } else {
                      _invitedPartnerIds.remove(contact.id);
                    }
                  });
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingEventToggle(ThemeData theme, AppPalette palette) {
    return Container(
      decoration: _cardDecoration(palette),
      padding: const EdgeInsets.all(24),
      margin: const EdgeInsets.only(bottom: 16),
      child: SwitchListTile(
        title: Text(
          'Floating Event',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: palette.textPrimary,
          ),
        ),
        subtitle: Text(
          'Event time can flex within the day',
          style: theme.textTheme.bodySmall?.copyWith(
            color: palette.textSecondary,
          ),
        ),
        value: _isFloatingEvent,
        onChanged: (value) {
          setState(() {
            _isFloatingEvent = value;
          });
        },
      ),
    );
  }

  Widget _buildPrivacySection(ThemeData theme, AppPalette palette) {
    return Container(
      decoration: _cardDecoration(palette),
      padding: const EdgeInsets.all(24),
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Privacy Level',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: EventPrivacyLevel.values.map((level) {
              final isSelected = _privacyLevel == level;
              return ChoiceChip(
                label: Text(level.name),
                selected: isSelected,
                onSelected: (_) {
                  setState(() {
                    _privacyLevel = level;
                  });
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(
    ThemeData theme,
    AppPalette palette,
    ColorScheme colorScheme,
  ) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
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

  Future<void> _saveEvent() async {
    if (_titleController.text.trim().isEmpty) {
      _showSnackBar('Please enter an event title');
      return;
    }

    setState(() => _isLoading = true);

    try {
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

      RecurrenceRule? recurrenceRule;
      if (_recurrenceSelection != SimpleRecurrence.oneOff) {
        recurrenceRule = _recurrenceSelection.buildRule(
          anchor: startDateTime,
          reuseId: _existingRecurrenceRuleId,
        );
      }

      final event = CalendarEvent(
        id: widget.eventToEdit?.id ?? '',
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        start: startDateTime,
        end: endDateTime,
        calendarId: _selectedCalendarId,
        ownerId: '', // Will be set by provider
        privacyLevel: _privacyLevel,
        invitedPartnerIds: _invitedPartnerIds.toList(),
        isFloating: _isFloatingEvent,
        recurrenceRule: recurrenceRule,
        createdAt: widget.eventToEdit?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // TODO: Replace with EventCubit when available
      // For now, just close the screen
      if (!mounted) return;
      Navigator.of(context).pop(event);
    } catch (e) {
      if (mounted) {
        _showSnackBar('Failed to save event: $e');
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );

    if (picked != null && mounted) {
      setState(() {
        _selectedDate = picked;
        if (_endDate.isBefore(_selectedDate)) {
          _endDate = _selectedDate;
        }
      });
    }
  }

  Future<void> _selectEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _selectedDate,
      lastDate: DateTime(2030),
    );

    if (picked != null && mounted) {
      setState(() {
        _endDate = picked;
      });
    }
  }

  void _handleRecurrenceChanged(SimpleRecurrence recurrence) {
    if (_recurrenceSelection == recurrence) return;
    setState(() {
      _recurrenceSelection = recurrence;
      if (recurrence != SimpleRecurrence.oneOff) {
        _suggestedRecurrence = null;
      }
    });
  }

  void _handleTitleChanged() {
    final nextSignature = _computeEventSignature();
    if (nextSignature == _suggestionSignature) return;
    _suggestionSignature = nextSignature;
    if (_recurrenceSelection == SimpleRecurrence.oneOff) {
      _loadRecurrenceSuggestion();
    }
  }

  String _computeEventSignature() {
    final title = _titleController.text.trim().toLowerCase();
    if (title.isEmpty) return '';
    final dayOfWeek = _selectedDate.weekday;
    return '$title-$dayOfWeek';
  }

  Future<void> _loadRecurrenceSuggestion() async {
    if (_suggestionSignature == null ||
        _suggestionSignature!.isEmpty ||
        _recurrenceSelection != SimpleRecurrence.oneOff) {
      if (_suggestedRecurrence != null && mounted) {
        setState(() => _suggestedRecurrence = null);
      }
      return;
    }

    final signature = _suggestionSignature!;
    final requestId = ++_suggestionRequestId;
    final suggestion =
        await RecurrenceSuggestionService.suggestionForEvent(signature);

    if (!mounted || requestId != _suggestionRequestId) return;

    setState(() {
      _suggestedRecurrence = suggestion;
    });
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}
