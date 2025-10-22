import 'dart:async';
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
import '../../logic/services/signal_color_service.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import '../widgets/availability/availability_signal_card.dart';
import 'create_event_screen.dart';

enum _DayAction { createEvent, signalAvailability }

/// Calendar screen - displays calendar view with events
///
/// Now uses Riverpod providers for all state management instead of local state.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  // Timer for showing the "Go to Today" button
  DateTime? _yearChangeTime;
  Timer? _buttonTimer;

  @override
  void dispose() {
    _buttonTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
    final nowInTimeZone = _nowInTimeZone(timeZone);
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final calendarsAsync = ref.watch(calendarListProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];
    final List<UserCalendar> calendars = calendarsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <UserCalendar>[],
    );
    final Map<String, UserCalendar> calendarLookup = {
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

    // Check if we should show the "Go to Today" button
    final now = DateTime.now();
    final shouldShowTodayButton = _yearChangeTime != null &&
        DateTime.now().difference(_yearChangeTime!).inSeconds < 10;

    // Check if focused date is in a different year than current year
    final isDifferentYear = focusedDate.year != now.year;

    // Update year change time when navigating to a different year
    if (isDifferentYear && _yearChangeTime == null) {
      setState(() {
        _yearChangeTime = DateTime.now();

        // Start timer to hide the button after 8 seconds
        _buttonTimer?.cancel();
        _buttonTimer = Timer(const Duration(seconds: 8), () {
          if (mounted) {
            setState(() {
              _yearChangeTime = null;
            });
          }
        });
      });
    } else if (!isDifferentYear && _yearChangeTime != null) {
      setState(() {
        _yearChangeTime = null;
        _buttonTimer?.cancel();
        _buttonTimer = null;
      });
    }

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        decoration: BoxDecoration(
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                  )
                : AppGradients.backgroundFor(palette.brightness)),
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 48),
          child: Stack(
            children: [
              SingleChildScrollView(
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
                      today: nowInTimeZone,
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
              // Floating "Go to Today" button
              if (shouldShowTodayButton)
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: Semantics(
                    label: 'Go to today',
                    button: true,
                    child: FloatingActionButton(
                      onPressed: () {
                        // Reset to today
                        ref.read(focusedDateProvider.notifier).resetToToday();
                        ref.read(selectedDateProvider.notifier).resetToToday();

                        // Hide the button
                        setState(() {
                          _yearChangeTime = null;
                          _buttonTimer?.cancel();
                          _buttonTimer = null;
                        });
                      },
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      child: const Text('Today'),
                    ),
                  ),
                ),
            ],
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
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;
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
                    color: palette.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.cardBorderBabyBlue,
                      width: 1.5,
                    ),
                    boxShadow: AppShadows.subtle,
                  ),
                  child: Text(
                    DateFormat('MMMM yyyy').format(focusedDate),
                    style: textStyles.heading4.copyWith(
                      color: palette.textPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildViewToggle(context, ref, currentView),
          const SizedBox(height: 8),
          Text(
            'Displaying $timeZone (${TimezoneService.abbreviationFor(timeZone)})',
            style: textStyles.caption.copyWith(
              color: palette.textPrimary.withValues(alpha: 0.85),
              fontWeight: FontWeight.w600,
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
    required BuildContext context,
    Key? key,
  }) {
    return SemanticIconButton(
      key: key,
      label: label,
      icon: icon,
      size: 20,
      color: AppColors.cardBorderBabyBlue,
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

  Border? _calendarBorder(AppPalette palette) {
    if (!palette.isDark) {
      return null;
    }
    return Border.all(
      color: AppColors.cardBorderBabyBlue,
      width: 1.5,
    );
  }

  Widget _buildViewToggle(
      BuildContext context, WidgetRef ref, CalendarView currentView) {
    final palette = AppPalette.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(28),
        border: _calendarBorder(palette),
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
            context: context,
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
            context: context,
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
      final palette = AppPalette.of(context);
      final buttonStyle = isSelected
          ? responsiveText.buttonMedium.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            )
          : responsiveText.buttonMedium.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: palette.textPrimary.withValues(alpha: 0.85),
            );
      final iconSize = 20 * (context.responsive.isPhone ? 1.0 : 1.1);

      return Expanded(
        child: SemanticButton(
          key: key,
          label: label,
          hint: 'Set calendar to $label view',
          enabled: !isSelected,
          onPressed: isSelected
              ? null
              : () {
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected ? palette.surface : Colors.transparent,
                  borderRadius: borderRadius,
                  border: Border.all(
                    color: isSelected
                        ? AppColors.cardBorderBabyBlue
                        : Colors.transparent,
                    width: 2,
                  ),
                  boxShadow: isSelected ? AppShadows.subtle : null,
                ),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    // Show only icon if width is too narrow for text
                    final showText = constraints.maxWidth > 50;

                    return Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          icon,
                          size: iconSize,
                          color: isSelected
                              ? AppColors.cardBorderBabyBlue
                              : AppColors.cardBorderBabyBlue,
                        ),
                        if (showText) ...[
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              label,
                              style: buttonStyle,
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ),
                        ],
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      );
    });
  }

  void _onViewSelected(WidgetRef ref, CalendarView view) {
    final focusedNotifier = ref.read(focusedDateProvider.notifier);
    ref.read(calendarViewModeProvider.notifier).setView(view);

    // Reset to today when switching views
    focusedNotifier.resetToToday();
    ref.read(selectedDateProvider.notifier).resetToToday();
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
    required DateTime today,
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
            contacts,
            today),
        CalendarView.week => _buildWeekView(
            context,
            ref,
            focusedDate,
            selectedDate,
            mySignals,
            sharedSignals,
            calendarLookup,
            allEvents,
            contacts,
            today),
        CalendarView.day => _buildDayView(context, ref, selectedDate, mySignals,
            sharedSignals, allEvents, contacts),
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
    DateTime today,
  ) {
    final palette = AppPalette.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(24),
        border: _calendarBorder(palette),
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
            today,
          ),
        ],
      ),
    );
  }

  Widget _buildWeekView(
    BuildContext context,
    WidgetRef ref,
    DateTime focusedDate,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    Map<String, UserCalendar> calendarLookup,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
    DateTime today,
  ) {
    final palette = AppPalette.of(context);
    final weekStart = _getWeekStart(focusedDate);
    final weekDays = List.generate(7, (i) => weekStart.add(Duration(days: i)));

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(24),
        border: _calendarBorder(palette),
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
            context,
            ref,
            weekDays,
            selectedDate,
            calendarLookup,
            mySignals,
            sharedSignals,
            allEvents,
            contacts,
            today,
          ),
        ],
      ),
    );
  }

  Widget _buildDayView(
    BuildContext context,
    WidgetRef ref,
    DateTime selectedDate,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
  ) {
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(28),
        border: _calendarBorder(palette),
        boxShadow: AppShadows.cardElevated,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            DateFormat('EEEE').format(selectedDate), // "Wednesday"
            style: textStyles.heading3.copyWith(color: palette.textPrimary),
          ),
          const SizedBox(height: 16),
          Text(
            selectedDate.day.toString(), // "15"
            style: textStyles.calendarDayHero,
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
        ],
      ),
    );
  }

  Widget _buildWeekdayHeadersShort() {
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return Builder(
      builder: (context) {
        final palette = AppPalette.of(context);
        final textStyles = context.responsiveText;
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: weekdays.map((day) {
            return Expanded(
              child: Center(
                child: Text(
                  day,
                  style: textStyles.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: palette.textSecondary,
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildWeekDayStrip(
    BuildContext context,
    WidgetRef ref,
    List<DateTime> weekDays,
    DateTime selectedDate,
    Map<String, UserCalendar> calendarLookup,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
    DateTime today,
  ) {
    final weekMetadata = _WeekStripMetadata.calculate(
      ref: ref,
      weekDays: weekDays,
      mySignals: mySignals,
      sharedSignals: sharedSignals,
    );

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: weekDays.map((date) {
        final meta = weekMetadata[date] ?? const _DayCellMeta();
        return _buildWeekDayCell(
          context,
          ref,
          date,
          selectedDate,
          calendarLookup,
          mySignals,
          sharedSignals,
          allEvents,
          contacts,
          meta,
          today,
        );
      }).toList(),
    );
  }

  Widget _buildWeekDayCell(
    BuildContext context,
    WidgetRef ref,
    DateTime date,
    DateTime selectedDate,
    Map<String, UserCalendar> calendarLookup,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<CalendarEvent> allEvents,
    List<Contact> contacts,
    _DayCellMeta meta,
    DateTime today,
  ) {
    final isSelected = _isSameDay(date, selectedDate);
    final isToday = _isSameDay(date, today);
    final textStyles = context.responsiveText;

    // Get events for this date
    final List<CalendarEvent> eventsForDate =
        meta.events ?? ref.watch(eventsForDateProvider(date));
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
    final List<AvailabilitySignal> mySignalsForDate = meta.mySignals ??
        _signalsForDate(mySignals, date, includeEntireDay: true);
    final List<AvailabilitySignal> sharedSignalsForDate = meta.sharedSignals ??
        _signalsForDate(sharedSignals, date, includeEntireDay: true);

    // Determine background color
    Color? backgroundColor;
    if (isSelected) {
      backgroundColor = AppColors.selectedBackground;
    } else if (isToday) {
      backgroundColor = AppColors.todayBackground;
    }

    // Use dark text on light backgrounds (selected/today)
    final textColorForDay = (isSelected || isToday)
        ? Colors.black87
        : AppPalette.of(context).textPrimary;
    final textColorForIndicators = (isSelected || isToday)
        ? Colors.black54
        : AppPalette.of(context).textSecondary;

    final borderRadius = BorderRadius.circular(16);
    final boxShadow = (isToday || isSelected)
        ? [
            BoxShadow(
              color: (backgroundColor ?? Colors.transparent)
                  .withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ]
        : null;

    final signalColors = <Color>[];

    // Group signals by user to get one color per connection
    final Map<String, AvailabilitySignal> signalsByUserId = {};

    if (mySignalsForDate.isNotEmpty) {
      signalColors.add(AppColors.signalAvailable);
    }

    // Deduplicate by userId - only one signal per connection
    for (final signal in sharedSignalsForDate) {
      signalsByUserId[signal.userId] = signal;
    }

    // Add one color per unique connection
    for (final signal in signalsByUserId.values) {
      final color = _colorForSignal(signal, contacts);
      if (!signalColors
          .any((existing) => existing.toARGB32() == color.toARGB32())) {
        signalColors.add(color);
      }
    }

    final dayNumberContent = Center(
      child: Text(
        date.day.toString(),
        style: textStyles.calendarDate.copyWith(color: textColorForDay),
      ),
    );

    return Expanded(
      child: Semantics(
        label: DateFormat('MMMM d').format(date),
        button: true,
        child: GestureDetector(
          onTap: () {
            ref.read(selectedDateProvider.notifier).setDate(date);
            ref.read(focusedDateProvider.notifier).setDate(date);
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Date number
              Container(
                constraints: const BoxConstraints(minHeight: 52),
                decoration: BoxDecoration(
                  color: backgroundColor ?? Colors.transparent,
                  borderRadius: borderRadius,
                  boxShadow: boxShadow,
                ),
                child: dayNumberContent,
              ),
              const SizedBox(height: 6),
              _buildDayIndicatorArea(
                barCount: barCount,
                barColors: barColors,
                showMoreIndicator: showMoreIndicator,
                textColorForIndicators: textColorForIndicators,
                signalColors: signalColors,
                isHighlighted: isSelected || isToday,
                reserveSignalRow: meta.reserveSignalRow,
              ),
            ],
          ),
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
    return Builder(
      builder: (context) {
        final palette = AppPalette.of(context);
        final textStyles = context.responsiveText;
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: weekdays.map((day) {
            return Expanded(
              child: Center(
                child: Text(
                  day,
                  style: textStyles.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: palette.textSecondary,
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
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
    DateTime today,
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
          today,
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
          today,
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
          today,
          isCurrentMonth: false,
        ),
      );
    }

    return Column(
      children: [
        for (int week = 0; week < 6; week++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
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
    List<Contact> contacts,
    DateTime today, {
    required bool isCurrentMonth,
  }) {
    final isSelected = date != null && _isSameDay(date, selectedDate);
    final isToday = date != null && _isSameDay(date, today);
    final textStyles = context.responsiveText;

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

    final signalColors = <Color>[];
    void addSignalColor(Color color) {
      if (signalColors.any(
        (existing) => existing.toARGB32() == color.toARGB32(),
      )) {
        return;
      }
      signalColors.add(color);
    }

    if (mySignalsForDate.isNotEmpty) {
      addSignalColor(AppColors.signalAvailable);
    }

    // Deduplicate signals by userId - one color per connection
    final Map<String, AvailabilitySignal> signalsByUserId = {};
    for (final signal in sharedSignalsForDate) {
      signalsByUserId[signal.userId] = signal;
    }

    // Add one color per unique connection
    for (final signal in signalsByUserId.values) {
      addSignalColor(_colorForSignal(signal, contacts));
    }

    final indicatorItems = <_DayIndicator>[
      if (signalColors.isNotEmpty) _DayIndicator.signal(colors: signalColors),
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
        _buildOverflowIcon(
            isHighlighted: isSelected || isToday, context: context),
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
            constraints: const BoxConstraints(minHeight: 64),
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
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    day.toString(),
                    style: textStyles.calendarDate.copyWith(
                      color: (isSelected || isToday)
                          ? Colors.white
                          : isCurrentMonth
                              ? AppPalette.of(context).textPrimary
                              : AppColors.disabledColor,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
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
        final colors = indicator.colors.isNotEmpty
            ? indicator.colors
            : (indicator.color != null
                ? [indicator.color!]
                : [AppColors.signalShared]);
        return _PulsingDot(
          colors: colors,
          isHighlighted: isHighlighted,
        );
      case _IndicatorType.event:
        final double size = indicator.isSoloEvent ? 5 : 6;
        // Keep event indicators in their original colors to represent different parties
        final color = indicator.color ?? AppColors.cardDark;
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

  Widget _buildOverflowIcon(
      {required bool isHighlighted, required BuildContext context}) {
    final palette = AppPalette.of(context);
    final iconColor = isHighlighted ? Colors.white : palette.textSecondary;
    return Icon(
      Icons.add_rounded,
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
    final textStyles = context.responsiveText;

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
              style: textStyles.bodySmall.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textSecondary.withValues(
                  alpha: 0.9,
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
          contacts: contacts,
        ),
      ),
      ...sharedSignalsForDay.map(
        (signal) => _buildSignalCard(
          context,
          ref,
          signal,
          isOwn: false,
          timeZone: timeZone,
          contacts: contacts,
        ),
      ),
    ];

    final sectionBackgroundGradient = palette.isDark
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
          )
        : null;
    final sectionBackgroundColor = palette.isDark ? null : palette.surface;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      decoration: BoxDecoration(
        gradient: sectionBackgroundGradient,
        color: sectionBackgroundColor,
        borderRadius: BorderRadius.circular(32),
        boxShadow: palette.isDark ? null : AppShadows.card,
        border: Border.all(
          color: AppColors.cardBorderBabyBlue,
          width: 1.5,
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
                  style: textStyles.heading4.copyWith(
                    color: palette.textPrimary,
                  ),
                ),
                SemanticButton(
                  label: 'Add event or availability signal',
                  hint: 'Opens quick create options',
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    _handleDayActionFromIcon(context, ref, selectedDate);
                  },
                  child: SizedBox(
                    width: 56,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: () {
                        HapticFeedback.mediumImpact();
                        _handleDayActionFromIcon(context, ref, selectedDate);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.cardBlue,
                        foregroundColor: Colors.white,
                        shape: const CircleBorder(),
                        padding: EdgeInsets.zero,
                        elevation: 2,
                      ),
                      child: const Icon(Icons.add, size: 28),
                    ),
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
    final textStyles = context.responsiveText;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_available,
            size: 48,
            color: palette.textSecondary.withValues(alpha: 0.9),
          ),
          const SizedBox(height: 16),
          Text(
            'No events on $friendlyDate',
            style: textStyles.bodyLarge.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the + button to schedule time or share availability.',
            style: textStyles.bodySmall.copyWith(
              color: palette.textPrimary.withValues(alpha: 0.9),
            ),
            textAlign: TextAlign.center,
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
    final isPrimaryCalendar = calendar == null || calendar.isPrimary;
    final emojiColor = ContactColorUtils.onColor(accentColor);
    final palette = AppPalette.of(context);
    final titleColor = palette.isDark ? Colors.white : palette.textPrimary;
    final timeColor = palette.textSecondary.withValues(alpha: 0.9);
    final categoryColor = palette.textTertiary;
    final normalizedCategory = category.replaceAllMapped(
      RegExp(r'\+(\d+)\s+more\b'),
      (match) => '+${match.group(1) ?? ''}',
    );
    final textStyles = context.responsiveText;

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
          gradient: isPrimaryCalendar
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    accentColor.withValues(alpha: 0.16),
                    accentColor.withValues(alpha: 0.05),
                  ],
                )
              : null,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppShadows.subtle,
          color: isPrimaryCalendar
              ? null
              : palette.surface.withValues(alpha: palette.isDark ? 0.4 : 1.0),
          border: Border.all(
            color: AppColors.cardBorderBabyBlue,
            width: 1.5,
          ),
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
                  style: textStyles.heading3.copyWith(color: emojiColor),
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
                    style: textStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w700,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    time,
                    style: textStyles.bodySmall.copyWith(
                      fontWeight: FontWeight.w600,
                      color: timeColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    normalizedCategory,
                    style: textStyles.caption.copyWith(
                      color: categoryColor,
                    ),
                  ),
                ],
              ),
            ),
            if (event != null) ...[
              const SizedBox(width: 8),
              Semantics(
                label: 'Edit event',
                button: true,
                child: IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: AppColors.cardBorderBabyBlue,
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
    required List<Contact> contacts,
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
    final Color accent =
        isOwn ? AppColors.signalAvailable : _colorForSignal(signal, contacts);
    final contact = isOwn ? null : _contactForSignal(signal, contacts);
    final ownerName = isOwn
        ? 'You'
        : contact?.name ??
            DevDataService.getMockUserById(signal.userId)?.displayName ??
            'Partner';
    final nowTz = TimezoneService.nowIn(timeZone);
    final palette = AppPalette.of(context);
    final titleColor = palette.textPrimary;
    final secondaryColor = palette.textSecondary.withValues(alpha: 0.9);
    final statusColor = palette.textSecondary.withValues(alpha: 0.9);
    final messageColor = palette.textSecondary.withValues(alpha: 0.9);

    final timeRangeLabel = '$startLabel → $endLabel';
    final statusLabel = SignalsService.isSignalActive(signal)
        ? 'Active • ${SignalsService.formatSignalTimeRemaining(signal.endTime.difference(nowTz))}'
        : 'Starts in ${_friendlyDuration(signal.startTime.difference(nowTz))}';

    return SemanticCard(
      label: 'Availability signal from $ownerName',
      hint: '$startLabel to $endLabel',
      child: AvailabilitySignalCard(
        accentColor: accent,
        ownerName: ownerName,
        timeRangeLabel: timeRangeLabel,
        statusLabel: statusLabel,
        message: signal.message,
        leadingIcon:
            isOwn ? Icons.wifi_tethering_rounded : Icons.people_outline,
        trailing: isOwn
            ? TextButton(
                onPressed: () => _showCancelSignalDialog(context, ref, signal),
                child: const Text('Cancel'),
              )
            : null,
        isOnDarkBackground: palette.isDark,
        titleColor: titleColor,
        secondaryColor: secondaryColor,
        statusColor: statusColor,
        messageColor: messageColor,
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

  Future<void> _handleDayActionFromIcon(
    BuildContext context,
    WidgetRef ref,
    DateTime date,
  ) async {
    await _handleDayLongPress(context, ref, date);
  }

  DateTime _nowInTimeZone(String timeZone) {
    try {
      return TimezoneService.nowIn(timeZone);
    } catch (_) {
      return DateTime.now();
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

  Widget _buildDayIndicatorArea({
    required int barCount,
    required List<Color> barColors,
    required bool showMoreIndicator,
    required Color textColorForIndicators,
    required List<Color> signalColors,
    required bool isHighlighted,
    required bool reserveSignalRow,
  }) {
    final textStyles = context.responsiveText;
    final hasBarContent = barCount > 0 || showMoreIndicator;
    final hasSignals = signalColors.isNotEmpty;
    final needsSignalSpace = hasSignals || reserveSignalRow;
    if (!hasBarContent && !needsSignalSpace) {
      return const SizedBox(height: 18);
    }

    final double height =
        ((hasBarContent && needsSignalSpace) || reserveSignalRow) ? 28 : 18;

    return SizedBox(
      height: height,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          if (hasBarContent)
            Align(
              alignment:
                  needsSignalSpace ? Alignment.topCenter : Alignment.center,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ...List.generate(
                    barCount,
                    (index) => Container(
                      margin: EdgeInsets.only(
                        bottom:
                            index == barCount - 1 && !showMoreIndicator ? 0 : 2,
                      ),
                      height: 4,
                      decoration: BoxDecoration(
                        color: barColors[index],
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
                            style: textStyles.caption.copyWith(
                              fontSize:
                                  (textStyles.caption.fontSize ?? 13) * 0.75,
                              fontWeight: FontWeight.w600,
                              color: textColorForIndicators,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          if (hasSignals)
            Align(
              alignment:
                  hasBarContent ? Alignment.bottomCenter : Alignment.center,
              child: _PulsingDot(
                colors: signalColors,
                isHighlighted: isHighlighted,
              ),
            )
          else if (reserveSignalRow)
            const Align(
              alignment: Alignment.bottomCenter,
              child: SizedBox(height: 16),
            ),
        ],
      ),
    );
  }

  Color _colorForSignal(
    AvailabilitySignal signal,
    List<Contact> contacts,
  ) {
    // Use SignalColorService for deterministic, cached color resolution
    // Handles new connections, missing contacts, and ensures consistency
    return SignalColorService.getSignalColor(signal, contacts);
  }

  Contact? _contactForSignal(
    AvailabilitySignal signal,
    List<Contact> contacts,
  ) {
    for (final contact in contacts) {
      if (contact.id == signal.userId ||
          contact.externalUserId == signal.userId) {
        return contact;
      }
    }
    return null;
  }

  /// Creates a subtle pulsing glow for days with shared signals so they stand out
  /// from selected/today states without conflicting with them.
  ///
  /// The animation loops smoothly between two opacity levels of the themed
  /// shared-signal background color.
  ///
  /// Note: We only instantiate this widget for days that actually need the pulse
  /// to avoid unnecessary animation controllers.
}

// legacy pulsing widget removed in favor of rotating _PulsingDot

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
    final iconColor = palette.isDark
        ? AppColors.cardBorderBabyBlue
        : palette.textPrimary;
    final titleColor = palette.textPrimary;
    final textStyles = context.responsiveText;

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
            style: textStyles.bodyMedium.copyWith(
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
  const _DayIndicator.signal({required this.colors})
      : type = _IndicatorType.signal,
        color = null,
        isSoloEvent = false;

  const _DayIndicator.event({required this.color, this.isSoloEvent = false})
      : type = _IndicatorType.event,
        colors = const [];

  final _IndicatorType type;
  final Color? color;
  final List<Color> colors;
  final bool isSoloEvent;
}

class _PulsingDot extends StatefulWidget {
  const _PulsingDot({
    required this.colors,
    required this.isHighlighted,
  }) : assert(colors.length > 0);

  final List<Color> colors;
  final bool isHighlighted;
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
    )..repeat();
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
        final pulseProgress =
            (math.sin(2 * math.pi * _controller.value) + 1) / 2;
        final scale = 1 + (pulseProgress * 0.4);
        final outerSize = _PulsingDot.size * 2.2 * scale;
        final maxSize = _PulsingDot.size * 2.6;
        final clampedOuter = outerSize.clamp(_PulsingDot.size * 1.6, maxSize);
        final glowOpacity = 0.2 + (0.35 * (1 - pulseProgress));
        final baseColor = _colorForProgress(_controller.value);
        final centerColor = widget.isHighlighted
            ? Color.lerp(baseColor, Colors.white, 0.25)!
            : baseColor;
        final glowColor = baseColor;

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
                  color: glowColor.withValues(alpha: glowOpacity),
                ),
              ),
              Container(
                width: _PulsingDot.size,
                height: _PulsingDot.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: centerColor,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Color _colorForProgress(double progress) {
    final colors = widget.colors;
    if (colors.length == 1) {
      return colors.first;
    }
    final scaled = progress * colors.length;
    final index = scaled.floor() % colors.length;
    final nextIndex = (index + 1) % colors.length;
    final t = scaled - index;
    return Color.lerp(colors[index], colors[nextIndex], t.clamp(0.0, 1.0)) ??
        colors[nextIndex];
  }
}

/// Pre-computes per-day layout hints so the week strip can keep tile heights
/// even without hard-coding multiple stacked rows.
class _WeekStripMetadata {
  static Map<DateTime, _DayCellMeta> calculate({
    required WidgetRef ref,
    required List<DateTime> weekDays,
    required List<AvailabilitySignal> mySignals,
    required List<AvailabilitySignal> sharedSignals,
  }) {
    final Map<DateTime, _DayCellMeta> result = {};
    bool hasAnySignalRow = false;

    for (final date in weekDays) {
      final ownSignals = _signalsForStaticDate(mySignals, date);
      final sharedSignalsForDate = _signalsForStaticDate(sharedSignals, date);
      final eventsForDate = ref.read(eventsForDateProvider(date));
      final hasEventRows = eventsForDate.isNotEmpty;
      final hasSignalRow =
          ownSignals.isNotEmpty || sharedSignalsForDate.isNotEmpty;
      hasAnySignalRow = hasAnySignalRow || hasSignalRow;

      result[date] = _DayCellMeta(
        events: eventsForDate,
        mySignals: ownSignals,
        sharedSignals: sharedSignalsForDate,
        hasEventRow: hasEventRows,
        hasSignalRow: hasSignalRow,
      );
    }

    if (hasAnySignalRow) {
      // Reserve a signal row for days that would otherwise appear shorter
      for (final date in weekDays) {
        final meta = result[date];
        if (meta == null || meta.hasSignalRow) continue;
        result[date] = meta.copyWith(reserveSignalRow: true);
      }
    }

    return result;
  }

  static List<AvailabilitySignal> _signalsForStaticDate(
    List<AvailabilitySignal> signals,
    DateTime date,
  ) {
    final dayStart = DateTime(date.year, date.month, date.day);
    final dayEnd = dayStart.add(const Duration(days: 1));
    return signals.where((signal) {
      return signal.endTime.isAfter(dayStart) &&
          signal.startTime.isBefore(dayEnd);
    }).toList(growable: false);
  }
}

class _DayCellMeta {
  const _DayCellMeta({
    this.events,
    this.mySignals,
    this.sharedSignals,
    this.hasEventRow = false,
    this.hasSignalRow = false,
    this.reserveSignalRow = false,
  });

  final List<CalendarEvent>? events;
  final List<AvailabilitySignal>? mySignals;
  final List<AvailabilitySignal>? sharedSignals;
  final bool hasEventRow;
  final bool hasSignalRow;
  final bool reserveSignalRow;

  _DayCellMeta copyWith({
    List<CalendarEvent>? events,
    List<AvailabilitySignal>? mySignals,
    List<AvailabilitySignal>? sharedSignals,
    bool? hasEventRow,
    bool? hasSignalRow,
    bool? reserveSignalRow,
  }) {
    return _DayCellMeta(
      events: events ?? this.events,
      mySignals: mySignals ?? this.mySignals,
      sharedSignals: sharedSignals ?? this.sharedSignals,
      hasEventRow: hasEventRow ?? this.hasEventRow,
      hasSignalRow: hasSignalRow ?? this.hasSignalRow,
      reserveSignalRow: reserveSignalRow ?? this.reserveSignalRow,
    );
  }
}
