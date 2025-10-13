import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../logic/providers/event_providers.dart' hide selectedDateProvider;
import '../../logic/providers/ui_state_providers.dart';
import '../../domain/event.dart';

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

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: Column(
            children: [
              _buildTopNavigation(context, ref, focusedDate, currentView),
              const SizedBox(height: 20),
              _buildViewToggle(ref, currentView),
              const SizedBox(height: 20),
              _buildCalendarView(ref, focusedDate, selectedDate, currentView,
                  key: ValueKey(currentView)),
              Expanded(
                child: _buildEventsSection(context, ref, selectedDate,
                    eventsForSelectedDate, currentView),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopNavigation(BuildContext context, WidgetRef ref,
      DateTime focusedDate, CalendarView currentView) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildNavigationButton(
            icon: Icons.arrow_back_ios_new,
            onPressed: () =>
                _handleNavigation(ref, currentView, forward: false),
            key: const Key('previous_month'),
          ),
          Expanded(
            child: Center(
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
          ),
          _buildNavigationButton(
            icon: Icons.arrow_forward_ios,
            onPressed: () => _handleNavigation(ref, currentView, forward: true),
            key: const Key('next_month'),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationButton(
      {required IconData icon, required VoidCallback onPressed, Key? key}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.subtle,
      ),
      child: IconButton(
        key: key,
        onPressed: onPressed,
        icon: Icon(icon, size: 20, color: AppColors.textPrimary),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppShadows.subtle,
        ),
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

  Widget _buildCalendarView(WidgetRef ref, DateTime focusedDate,
      DateTime selectedDate, CalendarView currentView,
      {Key? key}) {
    // Switch between different calendar views
    return KeyedSubtree(
      key: key,
      child: switch (currentView) {
        CalendarView.month => _buildMonthView(ref, focusedDate, selectedDate),
        CalendarView.week => _buildWeekView(ref, focusedDate, selectedDate),
        CalendarView.day => _buildDayView(ref, selectedDate),
      },
    );
  }

  Widget _buildMonthView(
      WidgetRef ref, DateTime focusedDate, DateTime selectedDate) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
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
          const SizedBox(height: 16),
          _buildMonthGrid(ref, focusedDate, selectedDate),
        ],
      ),
    );
  }

  Widget _buildWeekView(
      WidgetRef ref, DateTime focusedDate, DateTime selectedDate) {
    final weekStart = _getWeekStart(focusedDate);
    final weekDays = List.generate(7, (i) => weekStart.add(Duration(days: i)));

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
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
          const SizedBox(height: 16),
          _buildWeekDayStrip(ref, weekDays, selectedDate),
        ],
      ),
    );
  }

  Widget _buildDayView(WidgetRef ref, DateTime selectedDate) {
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
      WidgetRef ref, List<DateTime> weekDays, DateTime selectedDate) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: weekDays.map((date) {
        return _buildWeekDayCell(ref, date, selectedDate);
      }).toList(),
    );
  }

  Widget _buildWeekDayCell(
      WidgetRef ref, DateTime date, DateTime selectedDate) {
    final isSelected = _isSameDay(date, selectedDate);
    final isToday = _isSameDay(date, DateTime.now());

    // Get events for this date
    final eventsForDate = ref.watch(eventsForDateProvider(date));

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
              if (eventsForDate.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  child: Column(
                    children: eventsForDate.take(3).map((event) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 2),
                        height: 4,
                        decoration: BoxDecoration(
                          color: _getEventColor(eventsForDate.indexOf(event)),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      );
                    }).toList(),
                  ),
                ),
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
      WidgetRef ref, DateTime focusedDate, DateTime selectedDate) {
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
          _buildDayCell(ref, day, null, selectedDate, isCurrentMonth: false));
    }

    // Current month days
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(focusedDate.year, focusedDate.month, day);
      dayWidgets.add(
          _buildDayCell(ref, day, date, selectedDate, isCurrentMonth: true));
    }

    // Next month days to fill the grid
    final remainingCells = 42 - dayWidgets.length;
    for (int day = 1; day <= remainingCells; day++) {
      dayWidgets.add(
          _buildDayCell(ref, day, null, selectedDate, isCurrentMonth: false));
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
    WidgetRef ref,
    int day,
    DateTime? date,
    DateTime selectedDate, {
    required bool isCurrentMonth,
  }) {
    final isSelected = date != null && _isSameDay(date, selectedDate);
    final isToday = date != null && _isSameDay(date, DateTime.now());

    // Check if date has events using provider
    final hasEvents = date != null && ref.watch(dateHasEventsProvider(date));
    final eventColor = AppColors.eventPurple;

    // Determine background color
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
        child: Container(
          height: 56,
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
              if (hasEvents)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: (isSelected || isToday) ? Colors.white : eventColor,
                    shape: BoxShape.circle,
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

    return Container(
      margin: const EdgeInsets.only(top: 16),
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
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
                    onPressed: () => _showAddEventDialog(context),
                    icon: const Icon(Icons.add, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: sortedEvents.isEmpty
                  ? _buildMockEvent()
                  : ListView.builder(
                      padding: const EdgeInsets.only(bottom: 24),
                      itemCount: sortedEvents.length,
                      itemBuilder: (context, index) {
                        final event = sortedEvents[index];
                        final showDateHeader = isWeekView &&
                            (index == 0 ||
                                !_isSameDay(event.start,
                                    sortedEvents[index - 1].start));

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (showDateHeader)
                              Padding(
                                padding:
                                    const EdgeInsets.only(top: 16, bottom: 8),
                                child: Text(
                                  DateFormat('EEEE, MMM d').format(event.start),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white70,
                                  ),
                                ),
                              ),
                            _buildEventCard(
                              event.title,
                              '${DateFormat.jm().format(event.start)} - ${DateFormat.jm().format(event.end)} \u00B7 ${DateFormat('E, MMM d').format(event.start)}',
                              event.description ?? 'Event',
                              '🎲',
                            ),
                          ],
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMockEvent() {
    return _buildEventCard(
      'Board Game Night',
      '6:00 PM - 10:00 PM \u00B7 Sun, Oct 12',
      'Group activity',
      '🎲',
    );
  }

  Widget _buildEventCard(
      String title, String time, String category, String emoji) {
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
              color: const Color(0xFFF0F3FF),
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
      ),
    );
  }

  void _showAddEventDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Event'),
        content: const Text('Event creation dialog would go here'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement event creation
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
