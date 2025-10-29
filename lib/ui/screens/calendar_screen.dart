import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';
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
import '../widgets/add_circle_button.dart';
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
    final List<AvailabilitySignal> mySignals =
        mySignalsAsync.asData?.value ?? const <AvailabilitySignal>[];
    final List<AvailabilitySignal> sharedSignals =
        sharedSignalsAsync.asData?.value ?? const <AvailabilitySignal>[];
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
    final List<Contact> contacts = contactsAsync.maybeWhen(
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
          minimum: const EdgeInsets.only(top: 12),
          child: Stack(
            children: [
              SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
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
                      child: Text(
                          AppLocalizations.of(context).calendarTodayButton),
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
              Flexible(
                child: SemanticHeading(
                  label: DateFormat('MMMM yyyy').format(focusedDate),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0D15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.cardBorderBabyBlue,
                        width: 1.5,
                      ),
                      boxShadow: AppShadows.subtle,
                    ),
                    child: Stack(
                      alignment: Alignment.centerLeft,
                      children: [
                        const Positioned.fill(
                          child: CustomPaint(
                            painter: _TinyStarPainter(),
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SemanticImage(
                              label: 'Calendar icon',
                              child: Image.asset(
                                'icons/calendar_icon.webp',
                                width: 80,
                                height: 80,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Text(
                              DateFormat('MMMM yyyy').format(focusedDate),
                              style: textStyles.heading4.copyWith(
                                color: AppColors.textPrimaryDark,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildViewToggle(context, ref, currentView),
          const SizedBox(height: 8),
          Flexible(
            child: Text(
              'Displaying $timeZone (${TimezoneService.abbreviationFor(timeZone)})',
              style: textStyles.caption.copyWith(
                color: palette.textPrimary.withValues(alpha: 0.85),
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
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
    // Clamp text scale for navigation buttons
    final textScale =
        MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 1.5);
    return SemanticIconButton(
      key: key,
      label: label,
      icon: icon,
      size: 20 * textScale,
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
    // Clamp text scale to prevent UI blocking issues
    final textScale =
        MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 1.5);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: 4 * textScale,
        vertical: 4 * textScale,
      ),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(28 * textScale),
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
          SizedBox(width: 4 * textScale),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                // At high text scaling, reduce the spacing to fit better and make buttons smaller
                final buttonSpacing = textScale > 1.5 ? 1.0 : 4.0;
                final buttonPadding = EdgeInsets.symmetric(
                    horizontal: textScale > 1.5 ? 1.0 : 4.0,
                    vertical: textScale > 1.5 ? 2.0 : 6.0);

                return Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: buttonPadding,
                        child: _buildViewButton(
                          ref,
                          'Month',
                          'icons/month_icon.webp',
                          CalendarView.month,
                          currentView,
                          const Key('view_month'),
                        ),
                      ),
                    ),
                    SizedBox(width: buttonSpacing * textScale),
                    Expanded(
                      child: Container(
                        padding: buttonPadding,
                        child: _buildViewButton(
                          ref,
                          'Week',
                          'icons/week_icon.webp',
                          CalendarView.week,
                          currentView,
                          const Key('view_week'),
                        ),
                      ),
                    ),
                    SizedBox(width: buttonSpacing * textScale),
                    Expanded(
                      child: Container(
                        padding: buttonPadding,
                        child: _buildViewButton(
                          ref,
                          'Day',
                          'icons/day_icon.webp',
                          CalendarView.day,
                          currentView,
                          const Key('view_day'),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          SizedBox(width: 4 * textScale),
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
    String assetPath,
    CalendarView view,
    CalendarView currentView,
    Key key,
  ) {
    return Consumer(builder: (context, ref, _) {
      final isSelected = currentView == view;
      final borderRadius = BorderRadius.circular(16);
      final palette = AppPalette.of(context);
      // Clamp text scale for view buttons
      final textScale =
          MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 1.5);
      final iconSize =
          (28 * (context.responsive.isPhone ? 1.0 : 1.1) * textScale)
              .clamp(24.0, 40.0);

      return SemanticButton(
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
                  EdgeInsets.symmetric(horizontal: 4, vertical: 8 * textScale),
              constraints: const BoxConstraints(minHeight: 48),
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
              child: Center(
                child: Opacity(
                  opacity: isSelected ? 1.0 : 0.8,
                  child: Image.asset(
                    assetPath,
                    width: iconSize,
                    height: iconSize,
                    fit: BoxFit.contain,
                  ),
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
    final screenWidth = MediaQuery.sizeOf(context).width;
    final bool isCompactWidth = screenWidth < 420;
    final double horizontalMargin = isCompactWidth ? 12 : 16;
    final double horizontalPadding = isCompactWidth ? 12 : 16;
    return Container(
      margin: EdgeInsets.symmetric(horizontal: horizontalMargin),
      padding: EdgeInsets.symmetric(
        horizontal: horizontalPadding,
        vertical: 16,
      ),
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
    // Clamp text scale to prevent excessive sizing that blocks UI
    final textScale =
        MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 2.0);
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16 * textScale),
      padding: EdgeInsets.symmetric(
        horizontal: 32 * textScale,
        vertical: 28 * textScale,
      ),
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
          SizedBox(height: 16 * textScale),
          Text(
            selectedDate.day.toString(), // "15"
            style: textStyles.calendarDayHero.copyWith(
              fontSize: (64 * textScale).clamp(48.0, 96.0),
            ),
          ),
          SizedBox(height: 12 * textScale),
          Container(
            width: 80 * textScale,
            height: 4 * textScale,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(4 * textScale),
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
    // Clamp text scale to prevent layout overflow in week view
    final textScale =
        MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 1.5);

    // Get events for this date
    final List<CalendarEvent> eventsForDate =
        meta.events ?? ref.watch(eventsForDateProvider(date));
    final brightness = Theme.of(context).brightness;
    final eventColors = eventsForDate
        .map(
          (event) => ContactColorResolver.resolveColor(
            event: event,
            contacts: contacts,
            allEvents: allEvents,
            brightness: brightness,
          ),
        )
        .toList(growable: false);
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

    final signalDotGroups = _buildSignalDotGroups(
      mySignals: mySignalsForDate,
      sharedSignals: sharedSignalsForDate,
      contacts: contacts,
    );
    final maxEventLines = signalDotGroups.isNotEmpty ? 3 : 4;
    final barColors = eventColors.take(maxEventLines).toList(growable: false);

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
                constraints: BoxConstraints(
                  minHeight: 52 * textScale,
                ),
                decoration: BoxDecoration(
                  color: backgroundColor ?? Colors.transparent,
                  borderRadius: borderRadius,
                  boxShadow: boxShadow,
                ),
                child: dayNumberContent,
              ),
              SizedBox(height: 6 * textScale),
              _buildDayIndicatorArea(
                eventBarColors: barColors,
                signalDotGroups: signalDotGroups,
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
            padding: EdgeInsets.only(
                bottom: (6 *
                    MediaQuery.textScalerOf(context)
                        .scale(1.0)
                        .clamp(1.0, 1.5))),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              crossAxisAlignment: CrossAxisAlignment.start,
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

    final List<CalendarEvent> eventsForDate = date != null
        ? ref.watch(eventsForDateProvider(date))
        : const <CalendarEvent>[];
    final eventCount = eventsForDate.length;

    final List<AvailabilitySignal> mySignalsForDate = date != null
        ? _signalsForDate(mySignals, date, includeEntireDay: true)
        : const <AvailabilitySignal>[];
    final List<AvailabilitySignal> sharedSignalsForDate = date != null
        ? _signalsForDate(sharedSignals, date, includeEntireDay: true)
        : const <AvailabilitySignal>[];
    final signalCount = mySignalsForDate.length + sharedSignalsForDate.length;

    Color? backgroundColor;
    Color? textColor;
    if (isToday && !isSelected) {
      backgroundColor = AppColors.todayBackground;
      // Ensure sufficient contrast on today's background
      textColor = Colors.white;
    } else if (isSelected) {
      backgroundColor = AppColors.selectedBackground;
      // Ensure sufficient contrast on selected background
      textColor = Colors.white;
    } else {
      // For regular days, use default text color from palette
      textColor = isCurrentMonth
          ? AppPalette.of(context).textPrimary
          : AppColors.disabledColor;
    }

    final signalDotGroups = _buildSignalDotGroups(
      mySignals: mySignalsForDate,
      sharedSignals: sharedSignalsForDate,
      contacts: contacts,
    );
    final maxEventLines = signalDotGroups.isNotEmpty ? 3 : 4;
    final brightness = Theme.of(context).brightness;
    final eventBarColors = eventsForDate
        .take(maxEventLines)
        .map(
          (event) => ContactColorResolver.resolveColor(
            event: event,
            contacts: contacts,
            allEvents: allEvents,
            brightness: brightness,
          ),
        )
        .toList(growable: false);

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

    return Expanded(
      child: LayoutBuilder(
        builder: (context, constraints) {
          const cellMargin = EdgeInsets.all(2);
          final bool hasFiniteWidth =
              constraints.hasBoundedWidth && constraints.maxWidth.isFinite;
          final double? effectiveMinWidth = hasFiniteWidth
              ? math.min(
                  64,
                  math.max(
                    0,
                    constraints.maxWidth - cellMargin.horizontal,
                  ),
                )
              : null;

          return SemanticCard(
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
                constraints: BoxConstraints(
                  minHeight: 64, // Minimum touch target size for accessibility
                  minWidth: effectiveMinWidth ?? 0,
                ),
                margin: cellMargin,
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
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: Text(
                          day.toString(),
                          style: textStyles.calendarDate.copyWith(
                            color: textColor,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Ensure the indicator area is properly sized for accessibility scaling
                    _buildDayIndicatorArea(
                      eventBarColors: eventBarColors,
                      signalDotGroups: signalDotGroups,
                      isHighlighted: isSelected || isToday,
                      reserveSignalRow: false,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
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
    final l10n = AppLocalizations.of(context);

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
          timeZone,
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
              children: [
                Expanded(
                  child: Text(
                    headerText,
                    style: textStyles.heading4.copyWith(
                      color: palette.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                Builder(
                  builder: (buttonContext) {
                    void handleAddAction() {
                      HapticFeedback.mediumImpact();
                      _handleDayActionFromIcon(
                          buttonContext, ref, selectedDate);
                    }

                    return AddCircleButton(
                      semanticsLabel: l10n.calendarAddEventOrSignalLabel,
                      semanticsHint: l10n.calendarAddEventOrSignalHint,
                      onPressed: handleAddAction,
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (sortedEvents.isEmpty)
              _buildEmptyEventsState(context, selectedDate, timeZone)
            else
              Column(
                children: eventWidgets,
              ),
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
    String timeZone,
  ) {
    final brightness = Theme.of(context).brightness;
    Color accentColor;
    if (event != null) {
      accentColor = ContactColorResolver.resolveColor(
        event: event,
        contacts: contacts,
        allEvents: allEvents,
        brightness: brightness,
      );
    } else if (calendar != null) {
      accentColor = Color(calendar.colorValue);
    } else {
      accentColor = AppColors.eventBlue;
    }
    final isPrimaryCalendar = calendar == null || calendar.isPrimary;
    final palette = AppPalette.of(context);
    final titleColor = palette.isDark ? Colors.white : palette.textPrimary;
    final timeColor = palette.textSecondary.withValues(alpha: 0.9);
    final categoryColor = palette.textTertiary;
    final normalizedCategory = category.replaceAllMapped(
      RegExp(r'\+(\d+)\s+more\b'),
      (match) => '+${match.group(1) ?? ''}',
    );
    final textStyles = context.responsiveText;

    final startDisplay = event != null
        ? DateFormat('h:mm a').format(
            TimezoneService.convert(event.start, timeZone),
          )
        : '';
    final startParts = startDisplay.split(' ');
    final timePrimary = startParts.isNotEmpty ? startParts.first : '';
    final timeSuffix = startParts.length > 1 ? startParts[1] : '';
    final leadingTime = timePrimary.isNotEmpty ? timePrimary : '--';
    final timeTextColor = ContactColorUtils.onColor(accentColor);

    // Wrap entire card in clamped textScaling to prevent overflow
    return MediaQuery.withClampedTextScaling(
      minScaleFactor: 1.0,
      maxScaleFactor: 1.5,
      child: SemanticCard(
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
                  color: accentColor,
                  borderRadius: BorderRadius.circular(AppBorderRadius.medium),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      leadingTime,
                      style: textStyles.bodySmall.copyWith(
                        fontWeight: FontWeight.w700,
                        color: timeTextColor,
                        height: 1,
                      ),
                    ),
                    if (timeSuffix.isNotEmpty)
                      Text(
                        timeSuffix,
                        style: textStyles.caption.copyWith(
                          color: timeTextColor.withValues(alpha: 0.8),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  ],
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
                    icon: Image.asset(
                      'icons/pencil_icon.webp',
                      width: 20,
                      height: 20,
                      fit: BoxFit.contain,
                    ),
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

    // Wrap signal card in clamped textScaling to prevent overflow
    return MediaQuery.withClampedTextScaling(
      minScaleFactor: 1.0,
      maxScaleFactor: 1.5,
      child: SemanticCard(
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
                  onPressed: () =>
                      _showCancelSignalDialog(context, ref, signal),
                  child:
                      Text(AppLocalizations.of(context).calendarCancelButton),
                )
              : null,
          isOnDarkBackground: palette.isDark,
          titleColor: titleColor,
          secondaryColor: secondaryColor,
          statusColor: statusColor,
          messageColor: messageColor,
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
        final l10n = AppLocalizations.of(context);
        return AlertDialog(
          title: Text(l10n.calendarCancelSignalTitle),
          content: Text(
            l10n.calendarCancelSignalMessage,
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(l10n.calendarKeepButton),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(l10n.calendarCancelSignalButton),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await ref.read(activeSignalsProvider.notifier).cancelSignal(signal);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(AppLocalizations.of(context).calendarSignalCancelledMessage),
        ),
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
              title:
                  Text(AppLocalizations.of(context).calendarCreateEventTitle),
              subtitle: Text(
                DateFormat('EEEE, MMM d').format(date),
              ),
              onTap: () =>
                  Navigator.of(sheetContext).pop(_DayAction.createEvent),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.wifi_tethering_rounded),
              title: Text(
                  AppLocalizations.of(context).calendarSignalAvailabilityTitle),
              subtitle: Text(AppLocalizations.of(context)
                  .calendarSignalAvailabilitySubtitle),
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
    required List<Color> eventBarColors,
    required List<List<Color>> signalDotGroups,
    required bool isHighlighted,
    required bool reserveSignalRow,
  }) {
    // Clamp text scale to prevent layout overflow
    final textScale =
        MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 1.5);
    final hasEventBars = eventBarColors.isNotEmpty;
    final hasSignals = signalDotGroups.isNotEmpty;
    final needsSignalSpace = hasSignals || reserveSignalRow;
    if (!hasEventBars && !needsSignalSpace) {
      return SizedBox(height: 18 * textScale);
    }

    final signalRowHeight = 10 * textScale;
    final barHeight = 4 * textScale;
    final barSpacing = 2 * textScale;
    final eventStackHeight = hasEventBars
        ? (eventBarColors.length * barHeight) +
            math.max(eventBarColors.length - 1, 0) * barSpacing
        : 0.0;
    final double height;
    if (needsSignalSpace) {
      final totalHeight = signalRowHeight +
          (hasEventBars ? eventStackHeight + (4 * textScale) : 0);
      height = totalHeight.clamp(24 * textScale, 36 * textScale).toDouble();
    } else {
      height =
          eventStackHeight.clamp(18 * textScale, 32 * textScale).toDouble();
    }

    final effectiveDots = signalDotGroups.length;

    return SizedBox(
      height: height,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (needsSignalSpace)
            SizedBox(
              height: signalRowHeight,
              child: hasSignals
                  ? FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (var i = 0; i < effectiveDots; i++)
                            Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: 2 * textScale,
                              ),
                              child: _PulsingDot(
                                colors: signalDotGroups[i],
                                isHighlighted: isHighlighted,
                              ),
                            ),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          if (needsSignalSpace && hasEventBars) SizedBox(height: 4 * textScale),
          if (hasEventBars)
            SizedBox(
              height: eventStackHeight,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var index = 0; index < eventBarColors.length; index++)
                    Container(
                      margin: EdgeInsets.only(
                        bottom: index == eventBarColors.length - 1
                            ? 0.0
                            : barSpacing,
                      ),
                      height: barHeight,
                      decoration: BoxDecoration(
                        color: eventBarColors[index],
                        borderRadius: BorderRadius.circular(2 * textScale),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  List<List<Color>> _buildSignalDotGroups({
    required List<AvailabilitySignal> mySignals,
    required List<AvailabilitySignal> sharedSignals,
    required List<Contact> contacts,
  }) {
    const maxDots = 2;
    final orderedColors = <Color>[];

    if (mySignals.isNotEmpty) {
      orderedColors.add(AppColors.signalAvailable);
    }

    final seenColorValues = <int>{};
    for (final signal in sharedSignals) {
      final color = _colorForSignal(signal, contacts);
      final value = color.toARGB32();
      if (seenColorValues.contains(value)) {
        continue;
      }
      seenColorValues.add(value);
      orderedColors.add(color);
    }

    if (orderedColors.isEmpty) {
      return const <List<Color>>[];
    }

    final dotGroups = <List<Color>>[];
    for (final color in orderedColors) {
      if (dotGroups.length < maxDots) {
        dotGroups.add([color]);
      } else {
        dotGroups.last.add(color);
      }
    }

    // If we have more than max dots due to merging, trim defensively.
    return dotGroups.take(maxDots).toList(growable: false);
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
    final iconColor =
        palette.isDark ? AppColors.cardBorderBabyBlue : palette.textPrimary;
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
            AppLocalizations.of(context).calendarAvailabilitySignalsTitle,
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
    // Calculate text scale OUTSIDE AnimatedBuilder to avoid layout issues
    // MediaQuery inside AnimatedBuilder can cause '_debugRelayoutBoundaryAlreadyMarkedNeedsLayout' errors
    final textScale =
        MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 1.5);
    final baseSize = _PulsingDot.size * textScale;
    final maxSize = baseSize * 2.6;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final pulseProgress =
            (math.sin(2 * math.pi * _controller.value) + 1) / 2;
        final scale = 1 + (pulseProgress * 0.4);
        final outerSize = baseSize * 2.2 * scale;
        final clampedOuter = outerSize.clamp(baseSize * 1.6, maxSize);
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
                width: baseSize,
                height: baseSize,
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

class _TinyStarPainter extends CustomPainter {
  const _TinyStarPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final primaryPaint = Paint()
      ..color = Colors.white.withOpacity(0.32)
      ..style = PaintingStyle.fill;
    final secondaryPaint = Paint()
      ..color = Colors.white.withOpacity(0.18)
      ..style = PaintingStyle.fill;

    final largerStars = <Offset>[
      Offset(size.width * 0.1, size.height * 0.3),
      Offset(size.width * 0.18, size.height * 0.18),
      Offset(size.width * 0.28, size.height * 0.42),
      Offset(size.width * 0.35, size.height * 0.16),
      Offset(size.width * 0.48, size.height * 0.36),
      Offset(size.width * 0.6, size.height * 0.22),
    ];

    for (final offset in largerStars) {
      canvas.drawCircle(offset, 1.3, primaryPaint);
    }

    final tinyStars = <Offset>[
      Offset(size.width * 0.08, size.height * 0.48),
      Offset(size.width * 0.2, size.height * 0.1),
      Offset(size.width * 0.26, size.height * 0.28),
      Offset(size.width * 0.32, size.height * 0.52),
      Offset(size.width * 0.44, size.height * 0.14),
      Offset(size.width * 0.58, size.height * 0.4),
      Offset(size.width * 0.64, size.height * 0.18),
    ];

    for (final offset in tinyStars) {
      canvas.drawCircle(offset, 0.8, secondaryPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
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
