import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../core/timezone_service.dart';
import '../../core/responsive_utils.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart' hide selectedDateProvider;
import '../../logic/providers/settings_providers.dart';
import '../../logic/providers/ui_state_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/signals_service.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../domain/availability_signal.dart';
import '../../domain/user_calendar.dart';
import '../../core/color_utils.dart';
import '../../logic/utils/contact_color_resolver.dart';
import '../../logic/providers/calendar_providers.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import 'create_event_screen.dart';

enum _DayAction { createEvent, signalAvailability }

/// Calendar screen - displays calendar view with events
///
/// Now uses Riverpod providers for all state management instead of local state.
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch providers for state
    final settingsAsync = ref.watch(settingsControllerProvider);
    final timeZone = settingsAsync.maybeWhen(
      data: (settings) => settings.timeZone,
      orElse: () => TimezoneService.defaultDisplayName,
    );
    final selectedDate = ref.watch(selectedDateProvider);
    final focusedDate = ref.watch(focusedDateProvider);
    final currentView = ref.watch(calendarViewModeProvider);
    final eventsForSelectedDate =
        ref.watch(eventsForDateProvider(selectedDate));
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final calendarsAsync = ref.watch(calendarListProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];
    final calendars = calendarsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <UserCalendar>[],
    );
    final calendarLookup = {
      for (final calendar in calendars) calendar.id: calendar,
    };
    final eventsAsync = ref.watch(eventListProvider);
    final allEvents = eventsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <CalendarEvent>[],
    );
    final contactsAsync = ref.watch(contactListProvider);
    final contacts = contactsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <Contact>[],
    );

    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        decoration: BoxDecoration(
            gradient: AppGradients.backgroundFor(palette.brightness)),
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(0, 16, 0, 24),
            child: Column(
              children: [
                _buildTopNavigation(
                  context,
                  ref,
                  focusedDate,
                  currentView,
                  timeZone,
                ),
                const SizedBox(height: 16),
                _buildCalendarView(
                  context,
                  ref,
                  focusedDate,
                  selectedDate,
                  currentView,
                  mySignals,
                  sharedSignals,
                  calendarLookup,
                  allEvents,
                  contacts,
                  key: ValueKey(currentView),
                ),
                _buildEventsSection(
                  context,
                  ref,
                  selectedDate,
                  eventsForSelectedDate,
                  currentView,
                  mySignals,
                  sharedSignals,
                  timeZone,
                  calendarLookup,
                  contacts,
                  allEvents,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopNavigation(
    BuildContext context,
    WidgetRef ref,
    DateTime focusedDate,
    CalendarView currentView,
    String timeZone,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SemanticHeading(
                label: DateFormat('MMMM yyyy').format(focusedDate),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: AppShadows.subtle,
                  ),
                  child: Text(
                    DateFormat('MMMM yyyy').format(focusedDate),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildViewToggle(ref, currentView),
          const SizedBox(height: 8),
          Text(
            'Displaying $timeZone (${TimezoneService.abbreviationFor(timeZone)})',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationButton({
    required String label,
    required IconData icon,
    required VoidCallback onPressed,
    Key? key,
  }) {
    return SemanticIconButton(
      key: key,
      label: label,
      icon: icon,
      size: 20,
      color: AppColors.textPrimary,
      onPressed: onPressed,
    );
  }

  void _handleNavigation(WidgetRef ref, CalendarView view,
      {required bool forward}) {
    final focusedNotifier = ref.read(focusedDateProvider.notifier);
    final selectedNotifier = ref.read(selectedDateProvider.notifier);
    final selectedDate = ref.read(selectedDateProvider);

    switch (view) {
      case CalendarView.month:
        final currentFocus = ref.read(focusedDateProvider);
        final monthOffset = forward ? 1 : -1;
        final baseFocus =
            DateTime(currentFocus.year, currentFocus.month + monthOffset, 1);

        final desiredDay = selectedDate.day;
        final maxDay =
            DateUtils.getDaysInMonth(baseFocus.year, baseFocus.month);
        final adjustedDay = desiredDay.clamp(1, maxDay).toInt();
        final alignedDate = DateTime(
          baseFocus.year,
          baseFocus.month,
          adjustedDay,
        );

        focusedNotifier.setDate(alignedDate);
        selectedNotifier.setDate(alignedDate);
        break;
      case CalendarView.week:
        final deltaDays = forward ? 7 : -7;
        final newDate = selectedDate.add(Duration(days: deltaDays));
        focusedNotifier.setDate(newDate);
        selectedNotifier.setDate(newDate);
        break;
      case CalendarView.day:
        final deltaDays = forward ? 1 : -1;
        final newDate = selectedDate.add(Duration(days: deltaDays));
        focusedNotifier.setDate(newDate);
        selectedNotifier.setDate(newDate);
        break;
    }
  }

  Widget _buildViewToggle(WidgetRef ref, CalendarView currentView) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppShadows.subtle,
      ),
      child: Row(
        children: [
          _buildNavigationButton(
            label: 'Previous month',
            icon: Icons.arrow_back_ios_new,
            onPressed: () {
              HapticFeedback.lightImpact();
              _handleNavigation(ref, currentView, forward: false);
            },
            key: const Key('previous_month'),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Row(
              children: [
                _buildViewButton(
                  ref,
                  'Month',
                  Icons.calendar_view_month,
                  CalendarView.month,
                  currentView,
                  const Key('view_month'),
                ),
                const SizedBox(width: 8),
                _buildViewButton(
                  ref,
                  'Week',
                  Icons.view_week_outlined,
                  CalendarView.week,
                  currentView,
                  const Key('view_week'),
                ),
                const SizedBox(width: 8),
                _buildViewButton(
                  ref,
                  'Day',
                  Icons.calendar_today,
                  CalendarView.day,
                  currentView,
                  const Key('view_day'),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          _buildNavigationButton(
            label: 'Next month',
            icon: Icons.arrow_forward_ios,
            onPressed: () {
              HapticFeedback.lightImpact();
              _handleNavigation(ref, currentView, forward: true);
            },
            key: const Key('next_month'),
          ),
        ],
      ),
    );
  }

  Widget _buildViewButton(
    WidgetRef ref,
    String label,
    IconData icon,
    CalendarView view,
    CalendarView currentView,
    Key key,
  ) {
    return Consumer(builder: (context, ref, _) {
      final isSelected = currentView == view;
      final borderRadius = BorderRadius.circular(16);
      final responsiveText = context.responsiveText;
      final buttonStyle = isSelected
          ? responsiveText.buttonMedium.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.calendarBorder,
            )
          : responsiveText.buttonMedium.copyWith(
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            );
      final iconSize = 20 * (context.responsive.isPhone ? 1.0 : 1.1);

      return Expanded(
        child: SemanticButton(
          key: key,
          label: label,
          hint: 'Set calendar to $label view',
          enabled: !isSelected,
          onPressed: isSelected ? null : () {
            HapticFeedback.mediumImpact();
            _onViewSelected(ref, view);
          },
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: borderRadius,
              onTap: isSelected ? null : () => _onViewSelected(ref, view),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : Colors.transparent,
                  borderRadius: borderRadius,
                  border: Border.all(
                    color: isSelected
                        ? AppColors.calendarBorder
                        : Colors.transparent,
                    width: 2,
                  ),
                  boxShadow: isSelected ? AppShadows.subtle : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      icon,
                      size: iconSize,
                      color: isSelected
                          ? AppColors.calendarBorder
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: buttonStyle,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    });
  }

  void _onViewSelected(WidgetRef ref, CalendarView view) {
    final selectedDate = ref.read(selectedDateProvider);
    final focusedNotifier = ref.read(focusedDateProvider.notifier);
    ref.read(calendarViewModeProvider.notifier).setView(view);

    switch (view) {
      case CalendarView.month:
        focusedNotifier.setDate(
          DateTime(selectedDate.year, selectedDate.month, 1),
        );
        break;
      case CalendarView.week:
      case CalendarView.day:
        focusedNotifier.setDate(selectedDate);
        break;
    }
  }

  Widget _buildCalendarView(
    BuildContext context,
    WidgetRef ref,
    DateTime focusedDate,
    DateTime selectedDate,
    CalendarView currentView,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    Map<String, UserCalendar> calendarLookup,
    List<CalendarEvent> allEvents,
    List<Contact> contacts, {
    Key? key,
  }) {
    // Switch between different calendar views
    return KeyedSubtree(
      key: key,
      child: switch (currentView) {
        CalendarView.month => _buildMonthView(
            context,
            ref,
            focusedDate,
            selectedDate,
            mySignals,
            sharedSignals,
            calendarLookup,
            allEvents,
            contacts),
        CalendarView.week => _buildWeekView(ref, focusedDate, selectedDate,
            mySignals, sharedSignals, calendarLookup, allEvents, contacts),
        CalendarView.day => _buildDayView(
            ref, selectedDate, mySignals, sharedSignals, allEvents, contacts),
      },
    );
  }

  Widget _buildMonthView(
    BuildContext context,
    WidgetRef ref,
    DateTime focusedDate,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    Map<String, UserCalendar> calendarLookup,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildWeekdayHeaders(),
          const SizedBox(height: 12),
          _buildMonthGrid(
            context,
            ref,
            focusedDate,
            selectedDate,
            mySignals,
            sharedSignals,
            calendarLookup,
            allEvents,
            contacts,
          ),
        ],
      ),
    );
  }

  Widget _buildWeekView(
    WidgetRef ref,
    DateTime focusedDate,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    Map<String, UserCalendar> calendarLookup,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    final weekStart = _getWeekStart(focusedDate);
    final weekDays = List.generate(7, (i) => weekStart.add(Duration(days: i)));

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildWeekdayHeadersShort(),
          const SizedBox(height: 12),
          _buildWeekDayStrip(
            ref,
            weekDays,
            selectedDate,
            calendarLookup,
            mySignals,
            sharedSignals,
            allEvents,
            contacts,
          ),
        ],
      ),
    );
  }

  Widget _buildDayView(
    WidgetRef ref,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppShadows.cardElevated,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            DateFormat('EEEE').format(selectedDate), // "Wednesday"
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            selectedDate.day.toString(), // "15"
            style: const TextStyle(
              fontSize: 72,
              fontWeight: FontWeight.bold,
              color: AppColors.primary, // Blue
              height: 1.0,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: 80,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            DateFormat('MMMM yyyy').format(selectedDate), // "October 2025"
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeekdayHeadersShort() {
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: weekdays.map((day) {
        return Expanded(
          child: Center(
            child: Text(
              day,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildWeekDayStrip(
    WidgetRef ref,
    List<DateTime> weekDays,
    DateTime selectedDate,
    Map<String, UserCalendar> calendarLookup,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: weekDays.map((date) {
        return _buildWeekDayCell(
          ref,
          date,
          selectedDate,
          calendarLookup,
          mySignals,
          sharedSignals,
          allEvents,
          contacts,
        );
      }).toList(),
    );
  }

  Widget _buildWeekDayCell(
    WidgetRef ref,
    DateTime date,
    DateTime selectedDate,
    Map<String, UserCalendar> calendarLookup,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    final isSelected = _isSameDay(date, selectedDate);
    final isToday = _isSameDay(date, DateTime.now());

    // Get events for this date
    final eventsForDate = ref.watch(eventsForDateProvider(date));
    final eventCount = eventsForDate.length;
    final barCount = math.min(eventCount, 2);
    final showMoreIndicator = eventCount > 2;
    final barColors = eventsForDate.take(barCount).map((event) {
      if (event.invitedPartnerIds.isEmpty) {
        return Colors.black;
      }
      return ContactColorResolver.resolveColor(
        event: event,
        contacts: contacts,
        allEvents: allEvents,
      );
    }).toList(growable: false);
    final moreIndicatorColor =
        (isSelected || isToday) ? Colors.white : AppColors.textSecondary;

    final mySignalsForDate =
        _signalsForDate(mySignals, date, includeEntireDay: true);
    final sharedSignalsForDate =
        _signalsForDate(sharedSignals, date, includeEntireDay: true);

    // Determine background color
    Color? backgroundColor;
    if (isSelected) {
      backgroundColor = AppColors.selectedBackground;
    } else if (isToday) {
      backgroundColor = AppColors.todayBackground;
    } else if (mySignalsForDate.isNotEmpty) {
      backgroundColor = AppColors.signalOwnDayBackground;
    } else if (sharedSignalsForDate.isNotEmpty) {
      backgroundColor = AppColors.signalSharedDayBackground;
    }

    return Expanded(
      child: GestureDetector(
        onTap: () {
          ref.read(selectedDateProvider.notifier).setDate(date);
          ref.read(focusedDateProvider.notifier).setDate(date);
        },
        child: Column(
          children: [
            // Date number
            Container(
              height: 56,
              decoration: BoxDecoration(
                color: backgroundColor ?? Colors.transparent,
                borderRadius: BorderRadius.circular(16),
                boxShadow: (isToday || isSelected)
                    ? [
                        BoxShadow(
                          color: (backgroundColor ?? Colors.transparent)
                              .withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Center(
                child: Text(
                  date.day.toString(),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: (isSelected || isToday)
                        ? Colors.white
                        : AppColors.textPrimary,
                  ),
                ),
              ),
            ),
            // Event bars
            const SizedBox(height: 8),
            if (barCount > 0 || showMoreIndicator)
              SizedBox(
                height: showMoreIndicator ? 28 : 18,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    ...List.generate(
                      barCount,
                      (index) => Container(
                        margin: EdgeInsets.only(
                          bottom: index == barCount - 1 && !showMoreIndicator
                              ? 0
                              : 2,
                        ),
                        height: 4,
                        decoration: BoxDecoration(
                          color: (isSelected || isToday)
                              ? Colors.white
                              : barColors[index],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    if (showMoreIndicator)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '+',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: moreIndicatorColor,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Icon(
                              Icons.people_alt_rounded,
                              size: 10,
                              color: moreIndicatorColor,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              )
            else
              const SizedBox(height: 18),
            if (mySignalsForDate.isNotEmpty ||
                sharedSignalsForDate.isNotEmpty) ...[
              const SizedBox(height: 4),
              _buildSignalIndicatorRow(
                ownCount: mySignalsForDate.length,
                sharedCount: sharedSignalsForDate.length,
                isHighlighted: isSelected || isToday,
              ),
            ],
          ],
        ),
      ),
    );
  }

  DateTime _getWeekStart(DateTime date) {
    // Get the start of the week (Sunday)
    return date.subtract(Duration(days: date.weekday % 7));
  }

  Widget _buildWeekdayHeaders() {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: weekdays.map((day) {
        return Expanded(
          child: Center(
            child: Text(
              day,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildMonthGrid(
    BuildContext context,
    WidgetRef ref,
    DateTime focusedDate,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    Map<String, UserCalendar> calendarLookup,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    final firstDayOfMonth = DateTime(focusedDate.year, focusedDate.month, 1);
    final lastDayOfMonth = DateTime(focusedDate.year, focusedDate.month + 1, 0);
    final firstWeekday = firstDayOfMonth.weekday % 7;
    final daysInMonth = lastDayOfMonth.day;

    final previousMonth = DateTime(focusedDate.year, focusedDate.month, 0);
    final daysInPreviousMonth = previousMonth.day;

    List<Widget> dayWidgets = [];

    // Previous month days
    for (int i = firstWeekday - 1; i >= 0; i--) {
      final day = daysInPreviousMonth - i;
      dayWidgets.add(
        _buildDayCell(
          context,
          ref,
          day,
          null,
          selectedDate,
          calendarLookup,
          mySignals,
          sharedSignals,
          allEvents,
          contacts,
          isCurrentMonth: false,
        ),
      );
    }

    // Current month days
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(focusedDate.year, focusedDate.month, day);
      dayWidgets.add(
        _buildDayCell(
          context,
          ref,
          day,
          date,
          selectedDate,
          calendarLookup,
          mySignals,
          sharedSignals,
          allEvents,
          contacts,
          isCurrentMonth: true,
        ),
      );
    }

    // Next month days to fill the grid
    final remainingCells = 42 - dayWidgets.length;
    for (int day = 1; day <= remainingCells; day++) {
      dayWidgets.add(
        _buildDayCell(
          context,
          ref,
          day,
          null,
          selectedDate,
          calendarLookup,
          mySignals,
          sharedSignals,
          allEvents,
          contacts,
          isCurrentMonth: false,
        ),
      );
    }

    return Column(
      children: [
        for (int week = 0; week < 6; week++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: dayWidgets.sublist(week * 7, (week + 1) * 7),
            ),
          ),
      ],
    );
  }

  Widget _buildDayCell(
    BuildContext context,
    WidgetRef ref,
    int day,
    DateTime? date,
    DateTime selectedDate,
    Map<String, UserCalendar> calendarLookup,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts, {
    required bool isCurrentMonth,
  }) {
    final isSelected = date != null && _isSameDay(date, selectedDate);
    final isToday = date != null && _isSameDay(date, DateTime.now());

    final eventsForDate =
        date != null ? ref.watch(eventsForDateProvider(date)) : const [];
    final eventCount = eventsForDate.length;

    final mySignalsForDate = date != null
        ? _signalsForDate(mySignals, date, includeEntireDay: true)
        : const [];
    final sharedSignalsForDate = date != null
        ? _signalsForDate(sharedSignals, date, includeEntireDay: true)
        : const [];
    final signalCount = mySignalsForDate.length + sharedSignalsForDate.length;

    Color? backgroundColor;
    if (isToday && !isSelected) {
      backgroundColor = AppColors.todayBackground;
    } else if (isSelected) {
      backgroundColor = AppColors.selectedBackground;
    }

    final indicatorItems = <_DayIndicator>[
      ...mySignalsForDate.map(
        (_) => _DayIndicator.signal(AppColors.signalAvailable),
      ),
      ...sharedSignalsForDate.map(
        (_) => _DayIndicator.signal(AppColors.signalShared),
      ),
      ...eventsForDate.map((event) {
        final isSolo = event.invitedPartnerIds.isEmpty;
        final color = isSolo
            ? Colors.black
            : ContactColorResolver.resolveColor(
                event: event,
                contacts: contacts,
                allEvents: allEvents,
              );
        return _DayIndicator.event(color: color, isSoloEvent: isSolo);
      }),
    ];

    final displayedIndicators = <_DayIndicator>[];
    for (final indicator in indicatorItems) {
      if (displayedIndicators.length == 2) break;
      displayedIndicators.add(indicator);
    }

    final totalEventIndicators =
        indicatorItems.where((item) => item.type == _IndicatorType.event);
    final displayedEventCount =
        displayedIndicators.where((item) => item.type == _IndicatorType.event);
    final hasEventOverflow =
        totalEventIndicators.length > displayedEventCount.length;

    final indicatorHintParts = <String>[];
    if (signalCount > 0) {
      indicatorHintParts.add(
        '$signalCount availability ${signalCount == 1 ? 'signal' : 'signals'}',
      );
    }
    if (eventCount > 0) {
      indicatorHintParts.add(
        '$eventCount ${eventCount == 1 ? 'event' : 'events'}',
      );
    }
    final semanticHint = indicatorHintParts.isEmpty
        ? 'No events or availability signals'
        : indicatorHintParts.join(', ');

    final indicatorWidgets = <Widget>[
      for (final indicator in displayedIndicators)
        _buildIndicatorWidget(
          indicator,
          isHighlighted: isSelected || isToday,
        ),
      if (hasEventOverflow)
        _buildOverflowIcon(isHighlighted: isSelected || isToday),
    ];

    return Expanded(
      child: SemanticCard(
        label: date != null ? DateFormat('MMMM d').format(date) : '',
        hint: semanticHint,
        isButton: date != null,
        onTap: date != null
            ? () {
                ref.read(selectedDateProvider.notifier).setDate(date);
                ref.read(focusedDateProvider.notifier).setDate(date);
              }
            : null,
        child: GestureDetector(
          onLongPress: date != null
              ? () => _handleDayLongPress(context, ref, date)
              : null,
          child: Container(
            height: 64,
            margin: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: backgroundColor ?? Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              boxShadow: (isToday || isSelected)
                  ? [
                      BoxShadow(
                        color: (backgroundColor ?? Colors.transparent)
                            .withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  day.toString(),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: (isSelected || isToday)
                        ? Colors.white
                        : isCurrentMonth
                            ? AppColors.textPrimary
                            : AppColors.disabledColor,
                  ),
                ),
                SizedBox(
                  height: 20,
                  child: Center(
                    child: Wrap(
                      spacing: 4,
                      runSpacing: 2,
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: indicatorWidgets,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIndicatorWidget(
    _DayIndicator indicator, {
    required bool isHighlighted,
  }) {
    switch (indicator.type) {
      case _IndicatorType.signal:
        final centerColor = isHighlighted ? Colors.white : indicator.color;
        final glowColor = indicator.color;
        return _PulsingDot(
          color: centerColor,
          glowColor: glowColor,
        );
      case _IndicatorType.event:
        final double size = indicator.isSoloEvent ? 5 : 6;
        final color = isHighlighted ? Colors.white : indicator.color;
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        );
    }
  }

  Widget _buildOverflowIcon({required bool isHighlighted}) {
    final iconColor = isHighlighted ? Colors.white : AppColors.textSecondary;
    return Icon(
      Icons.people_alt_rounded,
      size: 12,
      color: iconColor,
    );
  }

  Widget _buildEventsSection(
    BuildContext context,
    WidgetRef ref,
    DateTime selectedDate,
    List<CalendarEvent> events,
    CalendarView currentView,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    String timeZone,
    Map<String, UserCalendar> calendarLookup,
    List<Contact> contacts,
    List<CalendarEvent> allEvents,
  ) {
    final isWeekView = currentView == CalendarView.week;
    final isDayView = currentView == CalendarView.day;

    // For week view, get all events for the week
    final displayEvents = isWeekView
        ? ref.watch(eventsForWeekProvider(_getWeekStart(selectedDate)))
        : events;

    // Sort events by date and time
    final sortedEvents = List<CalendarEvent>.from(displayEvents)
      ..sort((a, b) => a.start.compareTo(b.start));

    // Determine header text based on view
    final localizedSelected = TimezoneService.convert(selectedDate, timeZone);
    String headerText;
    if (isDayView) {
      headerText = "Today's Schedule";
    } else if (isWeekView) {
      headerText = 'This Week';
    } else {
      headerText = DateFormat('EEEE, MMM d').format(localizedSelected);
    }

    final dayStart = TimezoneService.buildInTimeZone(
      displayName: timeZone,
      year: localizedSelected.year,
      month: localizedSelected.month,
      day: localizedSelected.day,
    );
    final dayEnd = dayStart.add(const Duration(days: 1));
    final mySignalsForDay = _signalsInRange(mySignals, dayStart, dayEnd);
    final sharedSignalsForDay =
        _signalsInRange(sharedSignals, dayStart, dayEnd);
    final hasSignals =
        mySignalsForDay.isNotEmpty || sharedSignalsForDay.isNotEmpty;
    final palette = AppPalette.of(context);

    final eventWidgets = <Widget>[];
    for (var index = 0; index < sortedEvents.length; index++) {
      final event = sortedEvents[index];
      final showDateHeader = isWeekView &&
          (index == 0 ||
              !_isSameDay(event.start, sortedEvents[index - 1].start));

      if (showDateHeader) {
        final localizedHeader = TimezoneService.convert(event.start, timeZone);
        eventWidgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 8),
            child: Text(
              DateFormat('EEEE, MMM d').format(localizedHeader),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: palette.textSecondary.withValues(
                  alpha: palette.isDark ? 0.85 : 0.75,
                ),
              ),
            ),
          ),
        );
      }

      final window = TimezoneService.formatEventWindow(
        start: event.start,
        end: event.end,
        displayName: timeZone,
      );

      final calendar = calendarLookup[event.calendarId];

      eventWidgets.add(
        _buildEventCard(
          context,
          ref,
          event,
          calendar,
          contacts,
          allEvents,
          event.title,
          '${window.timeLabel} • ${window.dateLabel}',
          event.description ?? 'Event',
          '🎲',
        ),
      );

      if (index != sortedEvents.length - 1) {
        eventWidgets.add(const SizedBox(height: 16));
      }
    }

    final signalCards = <Widget>[
      ...mySignalsForDay.map(
        (signal) => _buildSignalCard(
          context,
          ref,
          signal,
          isOwn: true,
          timeZone: timeZone,
        ),
      ),
      ...sharedSignalsForDay.map(
        (signal) => _buildSignalCard(
          context,
          ref,
          signal,
          isOwn: false,
          timeZone: timeZone,
        ),
      ),
    ];

    final sectionBackground =
        palette.isDark ? AppColors.cardDark : palette.surface;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      decoration: BoxDecoration(
        color: sectionBackground,
        borderRadius: BorderRadius.circular(32),
        boxShadow: palette.isDark ? null : AppShadows.card,
        border: palette.isDark
            ? null
            : Border.all(
                color: palette.divider.withValues(alpha: 0.5),
              ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  headerText,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: palette.textPrimary,
                  ),
                ),
                Container(
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    onPressed: () {
                      HapticFeedback.mediumImpact();
                      _showAddEventDialog(
                        context,
                        selectedDate: selectedDate,
                      );
                    },
                    icon: const Icon(Icons.add, color: Colors.white),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (sortedEvents.isEmpty)
              _buildEmptyEventsState(context, selectedDate, timeZone)
            else
              ...eventWidgets,
            if (hasSignals) ...[
              const SizedBox(height: 20),
              _SignalsDisclosure(children: signalCards),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyEventsState(
      BuildContext context, DateTime selectedDate, String timeZone) {
    final palette = AppPalette.of(context);
    final localized = TimezoneService.convert(selectedDate, timeZone);
    final friendlyDate = DateFormat('EEEE, MMM d').format(localized);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_available,
            size: 48,
            color: palette.textSecondary.withValues(alpha: 0.7),
          ),
          const SizedBox(height: 16),
          Text(
            'No events on $friendlyDate',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the + button to schedule time or share availability.',
            style: TextStyle(
              fontSize: 15,
              color: palette.textSecondary.withValues(alpha: 0.75),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () {
              HapticFeedback.mediumImpact();
              _showAddEventDialog(
                context,
                selectedDate: selectedDate,
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Create event'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventCard(
    BuildContext context,
    WidgetRef ref,
    CalendarEvent? event,
    UserCalendar? calendar,
    List<Contact> contacts,
    List<CalendarEvent> allEvents,
    String title,
    String time,
    String category,
    String emoji,
  ) {
    Color accentColor;
    if (event != null) {
      accentColor = event.invitedPartnerIds.isEmpty
          ? Colors.black
          : ContactColorResolver.resolveColor(
              event: event,
              contacts: contacts,
              allEvents: allEvents,
            );
    } else if (calendar != null) {
      accentColor = Color(calendar.colorValue);
    } else {
      accentColor = AppColors.eventBlue;
    }
    final iconBackground = accentColor.withValues(alpha: 0.18);
    final isSecondaryCalendar = calendar != null && !calendar.isPrimary;
    final emojiColor = ContactColorUtils.onColor(accentColor);
    final palette = AppPalette.of(context);
    final titleColor = palette.textPrimary;
    final timeColor = palette.textSecondary.withValues(alpha: 0.9);
    final categoryColor = palette.textTertiary;

    return SemanticCard(
      label: title,
      hint: time,
      isButton: true,
      onTap: () {
        HapticFeedback.lightImpact();
        _showAddEventDialog(
          context,
          selectedDate: event?.start,
          eventToEdit: event,
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              accentColor.withValues(alpha: 0.16),
              accentColor.withValues(alpha: 0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppShadows.subtle,
          border: isSecondaryCalendar
              ? Border.all(
                  color: accentColor,
                  width: 2,
                )
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: iconBackground,
                borderRadius: BorderRadius.circular(AppBorderRadius.medium),
              ),
              child: Center(
                child: Text(
                  emoji,
                  style: TextStyle(fontSize: 24, color: emojiColor),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    time,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: timeColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    category,
                    style: TextStyle(
                      fontSize: 13,
                      color: categoryColor,
                    ),
                  ),
                ],
              ),
            ),
            if (event != null) ...[
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.edit, size: 20),
                color: AppColors.primary,
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  _showAddEventDialog(
                    context,
                    selectedDate: event.start,
                    eventToEdit: event,
                  );
                },
                tooltip: 'Edit event',
              ),
            ] else ...[
              const SizedBox(width: 12),
              Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  color: AppColors.eventPurple,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSignalCard(
    BuildContext context,
    WidgetRef ref,
    AvailabilitySignal signal, {
    required bool isOwn,
    required String timeZone,
  }) {
    final localizedStart = TimezoneService.convert(signal.startTime, timeZone);
    final localizedEnd = TimezoneService.convert(signal.endTime, timeZone);
    final dateFormat = DateFormat('EEE, MMM d');
    final timeFormat = DateFormat('h:mm a');
    final startLabel =
        '${timeFormat.format(localizedStart)} • ${dateFormat.format(localizedStart)}';
    final duration = localizedEnd.difference(localizedStart);
    final isPersistent = duration.inDays >= 365;
    final endLabel = isPersistent
        ? 'Until turned off'
        : '${timeFormat.format(localizedEnd)} • ${dateFormat.format(localizedEnd)}';
    final ownerName = isOwn
        ? 'You'
        : (DevDataService.getMockUserById(signal.userId)?.displayName ??
            'Partner');
    final accent = isOwn ? AppColors.signalAvailable : AppColors.signalShared;
    final nowTz = TimezoneService.nowIn(timeZone);
    final palette = AppPalette.of(context);
    final backgroundColor = palette.isDark
        ? accent.withValues(alpha: 0.12)
        : accent.withValues(alpha: 0.08);
    final iconBackground = palette.isDark
        ? Colors.white.withValues(alpha: 0.2)
        : accent.withValues(alpha: 0.16);
    final titleColor = palette.textPrimary;
    final secondaryColor =
        palette.textSecondary.withValues(alpha: palette.isDark ? 0.85 : 0.75);
    final statusColor =
        palette.textSecondary.withValues(alpha: palette.isDark ? 0.9 : 0.8);
    final messageColor =
        palette.textSecondary.withValues(alpha: palette.isDark ? 0.85 : 0.7);

    return SemanticCard(
      label: 'Availability signal from $ownerName',
      hint: '$startLabel to $endLabel',
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isOwn ? Icons.wifi_tethering_rounded : Icons.people_outline,
                color: accent,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        ownerName,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: titleColor,
                        ),
                      ),
                      if (isOwn)
                        TextButton(
                          onPressed: () =>
                              _showCancelSignalDialog(context, ref, signal),
                          child: const Text('Cancel'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$startLabel → $endLabel',
                    style: TextStyle(
                      color: secondaryColor,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    SignalsService.isSignalActive(signal)
                        ? 'Active • ${SignalsService.formatSignalTimeRemaining(signal.endTime.difference(nowTz))}'
                        : 'Starts in ${_friendlyDuration(signal.startTime.difference(nowTz))}',
                    style: TextStyle(
                      fontSize: 12,
                      color: statusColor,
                    ),
                  ),
                  if (signal.message != null && signal.message!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      '“${signal.message}”',
                      style: TextStyle(
                        color: messageColor,
                        fontStyle: FontStyle.italic,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showCancelSignalDialog(
    BuildContext context,
    WidgetRef ref,
    AvailabilitySignal signal,
  ) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Cancel Signal?'),
          content: const Text(
            'Are you sure you want to cancel this availability signal? This cannot be undone.',
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Keep'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Cancel Signal'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await ref.read(activeSignalsProvider.notifier).cancelSignal(signal);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Signal cancelled')),
      );
    }
  }

  String _friendlyDuration(Duration duration) {
    if (duration.isNegative) return '0m';
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    if (hours == 0) {
      return '${minutes}m';
    }
    if (minutes == 0) {
      return '${hours}h';
    }
    return '${hours}h ${minutes}m';
  }

  Future<void> _handleDayLongPress(
    BuildContext context,
    WidgetRef ref,
    DateTime date,
  ) async {
    final action = await showModalBottomSheet<_DayAction>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.event_available_outlined),
              title: const Text('Create event'),
              subtitle: Text(
                DateFormat('EEEE, MMM d').format(date),
              ),
              onTap: () =>
                  Navigator.of(sheetContext).pop(_DayAction.createEvent),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.wifi_tethering_rounded),
              title: const Text('Signal availability'),
              subtitle: const Text('Share time with selected partners'),
              onTap: () =>
                  Navigator.of(sheetContext).pop(_DayAction.signalAvailability),
            ),
          ],
        ),
      ),
    );

    if (!context.mounted || action == null) {
      return;
    }

    ref.read(selectedDateProvider.notifier).setDate(date);
    ref.read(focusedDateProvider.notifier).setDate(date);

    switch (action) {
      case _DayAction.createEvent:
        _showAddEventDialog(context, selectedDate: date);
        break;
      case _DayAction.signalAvailability:
        context.push('/signal-availability', extra: date);
        break;
    }
  }

  void _showAddEventDialog(
    BuildContext context, {
    DateTime? selectedDate,
    CalendarEvent? eventToEdit,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CreateEventScreen(
        initialDate: selectedDate,
        eventToEdit: eventToEdit,
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  List<AvailabilitySignal> _signalsForDate(
    List<AvailabilitySignal> signals,
    DateTime date, {
    bool includeEntireDay = false,
  }) {
    final dayStart = DateTime(date.year, date.month, date.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    return signals.where((signal) {
      final start = signal.startTime;
      final end = signal.endTime;
      if (includeEntireDay) {
        return end.isAfter(dayStart) && start.isBefore(dayEnd);
      }
      return end.isAfter(date) && start.isBefore(dayEnd);
    }).toList();
  }

  List<AvailabilitySignal> _signalsInRange(
    List<AvailabilitySignal> signals,
    DateTime rangeStart,
    DateTime rangeEnd,
  ) {
    return signals.where((signal) {
      return signal.endTime.isAfter(rangeStart) &&
          signal.startTime.isBefore(rangeEnd);
    }).toList();
  }

  Widget _buildSignalIndicatorRow({
    required int ownCount,
    required int sharedCount,
    required bool isHighlighted,
  }) {
    final ownColor = isHighlighted ? Colors.white : AppColors.signalAvailable;
    final sharedColor = isHighlighted ? Colors.white : AppColors.signalShared;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (ownCount > 0) ...[
          Icon(Icons.wifi_tethering_rounded, size: 12, color: ownColor),
          if (ownCount > 1)
            Padding(
              padding: const EdgeInsets.only(left: 2),
              child: Text(
                'x$ownCount',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: ownColor,
                ),
              ),
            ),
        ],
        if (ownCount > 0 && sharedCount > 0) const SizedBox(width: 6),
        if (sharedCount > 0) ...[
          Icon(Icons.people_alt_rounded, size: 12, color: sharedColor),
          if (sharedCount > 1)
            Padding(
              padding: const EdgeInsets.only(left: 2),
              child: Text(
                'x$sharedCount',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: sharedColor,
                ),
              ),
            ),
        ],
      ],
    );
  }
}

class _SignalsDisclosure extends StatelessWidget {
  const _SignalsDisclosure({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final tileTheme = theme.copyWith(
      dividerColor: Colors.transparent,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: Colors.transparent,
    );

    final sharedBackground = palette.isDark
        ? Colors.white.withValues(alpha: 0.08)
        : palette.surfaceVariant;
    final borderColor = palette.isDark
        ? Colors.white.withValues(alpha: 0.12)
        : palette.divider.withValues(alpha: 0.6);
    final iconColor = palette.isDark ? Colors.white : palette.textSecondary;
    final titleColor = palette.isDark ? Colors.white : palette.textPrimary;

    return Container(
      decoration: BoxDecoration(
        color: sharedBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
      ),
      child: Theme(
        data: tileTheme,
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          collapsedIconColor: iconColor,
          iconColor: iconColor,
          backgroundColor: sharedBackground,
          collapsedBackgroundColor: sharedBackground,
          collapsedShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Availability signals',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: titleColor,
            ),
          ),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

enum _IndicatorType { signal, event }

class _DayIndicator {
  const _DayIndicator.signal(this.color)
      : type = _IndicatorType.signal,
        isSoloEvent = false;

  const _DayIndicator.event({required this.color, this.isSoloEvent = false})
      : type = _IndicatorType.event;

  final _IndicatorType type;
  final Color color;
  final bool isSoloEvent;
}

class _PulsingDot extends StatefulWidget {
  const _PulsingDot({
    required this.color,
    required this.glowColor,
  });

  final Color color;
  final Color glowColor;
  static const double size = 6;

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final scale = 1 + (_controller.value * 0.4);
        final outerSize = _PulsingDot.size * 2.2 * scale;
        final maxSize = _PulsingDot.size * 2.6;
        final clampedOuter = outerSize.clamp(_PulsingDot.size * 1.6, maxSize);
        final glowOpacity = 0.2 + (0.35 * (1 - _controller.value));

        return SizedBox(
          width: maxSize,
          height: maxSize,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: clampedOuter,
                height: clampedOuter,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.glowColor.withValues(alpha: glowOpacity),
                ),
              ),
              Container(
                width: _PulsingDot.size,
                height: _PulsingDot.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.color,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
