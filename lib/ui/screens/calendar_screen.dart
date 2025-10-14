import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart' hide selectedDateProvider;
import '../../logic/providers/ui_state_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../domain/event.dart';
import '../../domain/availability_signal.dart';
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
    final selectedDate = ref.watch(selectedDateProvider);
    final focusedDate = ref.watch(focusedDateProvider);
    final currentView = ref.watch(calendarViewModeProvider);
    final eventsForSelectedDate =
        ref.watch(eventsForDateProvider(selectedDate));
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 24),
            child: Column(
              children: [
                _buildTopNavigation(context, ref, focusedDate, currentView),
                const SizedBox(height: 16),
                _buildCalendarView(
                  context,
                  ref,
                  focusedDate,
                  selectedDate,
                  currentView,
                  mySignals,
                  sharedSignals,
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
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopNavigation(BuildContext context, WidgetRef ref,
      DateTime focusedDate, CalendarView currentView) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
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
            ],
          ),
          const SizedBox(height: 12),
          _buildViewToggle(ref, currentView),
        ],
      ),
    );
  }

  Widget _buildNavigationButton({
    required IconData icon,
    required VoidCallback onPressed,
    Key? key,
  }) {
    return SizedBox(
      width: 44,
      height: 44,
      child: Material(
        color: Colors.transparent,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: AppShadows.subtle,
          ),
          child: IconButton(
            key: key,
            onPressed: onPressed,
            icon: Icon(icon, size: 20, color: AppColors.textPrimary),
          ),
        ),
      ),
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
            icon: Icons.arrow_back_ios_new,
            onPressed: () =>
                _handleNavigation(ref, currentView, forward: false),
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
            icon: Icons.arrow_forward_ios,
            onPressed: () => _handleNavigation(ref, currentView, forward: true),
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
    final isSelected = currentView == view;
    return Expanded(
      child: GestureDetector(
        key: key,
        onTap: () => _onViewSelected(ref, view),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppColors.calendarBorder : Colors.transparent,
              width: 2,
            ),
            boxShadow: isSelected ? AppShadows.subtle : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected
                    ? AppColors.calendarBorder
                    : AppColors.textSecondary,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected
                      ? AppColors.calendarBorder
                      : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
    List<AvailabilitySignal> sharedSignals, {
    Key? key,
  }) {
    // Switch between different calendar views
    return KeyedSubtree(
      key: key,
      child: switch (currentView) {
        CalendarView.month => _buildMonthView(
            context, ref, focusedDate, selectedDate, mySignals, sharedSignals),
        CalendarView.week => _buildWeekView(
            ref, focusedDate, selectedDate, mySignals, sharedSignals),
        CalendarView.day =>
          _buildDayView(ref, selectedDate, mySignals, sharedSignals),
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
            mySignals,
            sharedSignals,
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
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: weekDays.map((date) {
        return _buildWeekDayCell(
          ref,
          date,
          selectedDate,
          mySignals,
          sharedSignals,
        );
      }).toList(),
    );
  }

  Widget _buildWeekDayCell(
    WidgetRef ref,
    DateTime date,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
  ) {
    final isSelected = _isSameDay(date, selectedDate);
    final isToday = _isSameDay(date, DateTime.now());

    // Get events for this date
    final eventsForDate = ref.watch(eventsForDateProvider(date));
    final eventCount = eventsForDate.length;
    final barCount = math.min(eventCount, 2);
    final showMoreIndicator = eventCount > 2;
    final moreIndicatorColor =
        (isSelected || isToday) ? Colors.white : AppColors.textSecondary;

    final mySignalsForDate =
        _signalsForDate(mySignals, date, includeEntireDay: true);
    final sharedSignalsForDate =
        _signalsForDate(sharedSignals, date, includeEntireDay: true);

    // Determine background color
    Color? backgroundColor;
    if (isToday && !isSelected) {
      backgroundColor = AppColors.todayBackground;
    } else if (isSelected) {
      backgroundColor = AppColors.selectedBackground;
    }

    return Expanded(
      child: GestureDetector(
        onTap: () {
          ref.read(selectedDateProvider.notifier).setDate(date);
          ref.read(focusedDateProvider.notifier).setDate(date);
        },
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
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
                            color: _getEventColor(index),
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
      ),
    );
  }

  Color _getEventColor(int index) {
    final colors = [
      const Color(0xFF10B981), // Green
      const Color(0xFF3B82F6), // Blue
      const Color(0xFFF59E0B), // Orange
      AppColors.eventPurple, // Purple
    ];
    return colors[index % colors.length];
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
          mySignals,
          sharedSignals,
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
          mySignals,
          sharedSignals,
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
          mySignals,
          sharedSignals,
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
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals, {
    required bool isCurrentMonth,
  }) {
    final isSelected = date != null && _isSameDay(date, selectedDate);
    final isToday = date != null && _isSameDay(date, DateTime.now());

    final eventsForDate =
        date != null ? ref.watch(eventsForDateProvider(date)) : const [];
    final eventCount = eventsForDate.length;
    final dotCount = math.min(eventCount, 2);
    final showMoreIndicator = eventCount > 2;
    final eventColor = AppColors.eventPurple;

    final mySignalsForDate = date != null
        ? _signalsForDate(mySignals, date, includeEntireDay: true)
        : const [];
    final sharedSignalsForDate = date != null
        ? _signalsForDate(sharedSignals, date, includeEntireDay: true)
        : const [];

    Color? backgroundColor;
    if (isToday && !isSelected) {
      backgroundColor = AppColors.todayBackground;
    } else if (isSelected) {
      backgroundColor = AppColors.selectedBackground;
    }

    return Expanded(
      child: GestureDetector(
        onTap: date != null
            ? () {
                ref.read(selectedDateProvider.notifier).setDate(date);
                ref.read(focusedDateProvider.notifier).setDate(date);
              }
            : null,
        onLongPress:
            date != null ? () => _handleDayLongPress(context, ref, date) : null,
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
              if (eventCount > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ...List.generate(
                        dotCount,
                        (index) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: (isSelected || isToday)
                                ? Colors.white
                                : eventColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                      if (showMoreIndicator)
                        Padding(
                          padding: const EdgeInsets.only(left: 2),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '+',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: (isSelected || isToday)
                                      ? Colors.white
                                      : AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 2),
                              Icon(
                                Icons.people_alt_rounded,
                                size: 10,
                                color: (isSelected || isToday)
                                    ? Colors.white
                                    : AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              if (mySignalsForDate.isNotEmpty ||
                  sharedSignalsForDate.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: _buildSignalIndicatorRow(
                    ownCount: mySignalsForDate.length,
                    sharedCount: sharedSignalsForDate.length,
                    isHighlighted: isSelected || isToday,
                  ),
                ),
            ],
          ),
        ),
      ),
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
    String headerText;
    if (isDayView) {
      headerText = "Today's Schedule";
    } else if (isWeekView) {
      headerText = 'This Week';
    } else {
      headerText = DateFormat('EEEE, MMM d').format(selectedDate);
    }

    final dayStart =
        DateTime(selectedDate.year, selectedDate.month, selectedDate.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    final mySignalsForDay = _signalsInRange(mySignals, dayStart, dayEnd);
    final sharedSignalsForDay =
        _signalsInRange(sharedSignals, dayStart, dayEnd);

    final eventWidgets = <Widget>[];
    for (var index = 0; index < sortedEvents.length; index++) {
      final event = sortedEvents[index];
      final showDateHeader = isWeekView &&
          (index == 0 ||
              !_isSameDay(event.start, sortedEvents[index - 1].start));

      if (showDateHeader) {
        eventWidgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 8),
            child: Text(
              DateFormat('EEEE, MMM d').format(event.start),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.white70,
              ),
            ),
          ),
        );
      }

      eventWidgets.add(
        _buildEventCard(
          context,
          ref,
          event,
          event.title,
          '${DateFormat.jm().format(event.start)} - ${DateFormat.jm().format(event.end)} \u00B7 ${DateFormat('E, MMM d').format(event.start)}',
          event.description ?? 'Event',
          '🎲',
        ),
      );

      if (index != sortedEvents.length - 1) {
        eventWidgets.add(const SizedBox(height: 16));
      }
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
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
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Container(
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    onPressed: () => _showAddEventDialog(
                      context,
                      selectedDate: selectedDate,
                    ),
                    icon: const Icon(Icons.add, color: Colors.white),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (mySignalsForDay.isNotEmpty ||
                sharedSignalsForDay.isNotEmpty) ...[
              const Text(
                'Availability signals',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              ...mySignalsForDay.map(
                (signal) => _buildSignalCard(
                  context,
                  ref,
                  signal,
                  isOwn: true,
                ),
              ),
              ...sharedSignalsForDay.map(
                (signal) => _buildSignalCard(
                  context,
                  ref,
                  signal,
                  isOwn: false,
                ),
              ),
              const SizedBox(height: 20),
            ],
            if (sortedEvents.isEmpty)
              _buildEmptyEventsState(context, selectedDate)
            else
              ...eventWidgets,
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyEventsState(BuildContext context, DateTime selectedDate) {
    final friendlyDate = DateFormat('EEEE, MMM d').format(selectedDate);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_available,
            size: 48,
            color: Colors.white.withValues(alpha: 0.9),
          ),
          const SizedBox(height: 16),
          Text(
            'No events on $friendlyDate',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the + button to schedule time or share availability.',
            style: TextStyle(
              fontSize: 15,
              color: Colors.white.withValues(alpha: 0.75),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => _showAddEventDialog(
              context,
              selectedDate: selectedDate,
            ),
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
    String title,
    String time,
    String category,
    String emoji,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppGradients.eventCard,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.subtle,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _resolveEventAccentColor(ref, event),
              borderRadius: BorderRadius.circular(AppBorderRadius.medium),
            ),
            child: Center(
              child: Text(
                emoji,
                style: const TextStyle(fontSize: 24),
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
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  time,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textLight,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  category,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textTertiary,
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
              onPressed: () => _showAddEventDialog(
                context,
                selectedDate: event.start,
                eventToEdit: event,
              ),
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
    );
  }

  Widget _buildSignalCard(
    BuildContext context,
    WidgetRef ref,
    AvailabilitySignal signal, {
    required bool isOwn,
  }) {
    final dateFormat = DateFormat('EEE, MMM d');
    final timeFormat = DateFormat('h:mm a');
    final startLabel =
        '${timeFormat.format(signal.startTime)} • ${dateFormat.format(signal.startTime)}';
    final duration = signal.endTime.difference(signal.startTime);
    final isPersistent = duration.inDays >= 365;
    final endLabel = isPersistent
        ? 'Until turned off'
        : '${timeFormat.format(signal.endTime)} • ${dateFormat.format(signal.endTime)}';
    final ownerName = isOwn
        ? 'You'
        : (DevDataService.getMockUserById(signal.userId)?.displayName ??
            'Partner');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                ownerName,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              if (isOwn)
                TextButton(
                  onPressed: () async {
                    await ref
                        .read(activeSignalsProvider.notifier)
                        .cancelSignal(signal);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Signal cancelled')),
                    );
                  },
                  child: const Text('Cancel'),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '$startLabel → $endLabel',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          if (signal.message != null && signal.message!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              signal.message!,
              style: const TextStyle(color: Colors.white),
            ),
          ],
        ],
      ),
    );
  }

  Color _resolveEventAccentColor(WidgetRef ref, CalendarEvent? event) {
    const defaultColor = Color(0xFFF0F3FF);
    if (event == null || event.invitedPartnerIds.isEmpty) {
      return defaultColor;
    }

    final contactsValue = ref.watch(contactListProvider);
    return contactsValue.maybeWhen(
      data: (contacts) {
        for (final partnerId in event.invitedPartnerIds) {
          final matches = contacts.where((contact) => contact.id == partnerId);
          if (matches.isNotEmpty) {
            return _partnerAccentColorForName(matches.first.name);
          }
        }
        return defaultColor;
      },
      orElse: () => defaultColor,
    );
  }

  Color _partnerAccentColorForName(String name) {
    const palette = [
      AppColors.eventPurple,
      AppColors.eventOrange,
      AppColors.eventGreen,
      AppColors.eventBlue,
      AppColors.eventRed,
    ];
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      return palette.first;
    }
    final code = trimmed.codeUnitAt(0);
    final index = code % palette.length;
    return palette[index];
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
    final ownColor = isHighlighted ? Colors.white : AppColors.eventGreen;
    final sharedColor = isHighlighted ? Colors.white : AppColors.eventBlue;

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
