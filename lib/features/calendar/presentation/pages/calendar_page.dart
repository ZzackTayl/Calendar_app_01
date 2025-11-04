import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:myorbit_calendar/core/responsive_utils.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';
import 'package:myorbit_calendar/presentation/cubit/settings/settings_cubit.dart';
import 'package:myorbit_calendar/ui/widgets/add_circle_button.dart';

enum CalendarViewMode { month, week, day }

/// Calendar Screen - BLoC version with month/week/day views
class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _focusedDate = DateTime.now();
  DateTime _selectedDate = DateTime.now();
  CalendarViewMode _viewMode = CalendarViewMode.month;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final settingsState = context.watch<SettingsCubit>().state;
    final timeZone = settingsState.settings.timeZone;

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
              : AppGradients.backgroundFor(palette.brightness),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(context, palette, theme),
              _buildViewModeSelector(palette, theme),
              Expanded(
                child: _buildCalendarView(context, palette, theme, timeZone),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: _buildFAB(context, timeZone),
    );
  }

  Widget _buildHeader(
      BuildContext context, AppPalette palette, ThemeData theme) {
    final textStyles = context.responsiveText;
    final monthYear = DateFormat('MMMM yyyy').format(_focusedDate);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Calendar',
                  style: textStyles.heading2.copyWith(
                    color: palette.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  monthYear,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: _previousPeriod,
            tooltip: 'Previous',
          ),
          TextButton(
            onPressed: _goToToday,
            child: const Text('Today'),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _nextPeriod,
            tooltip: 'Next',
          ),
        ],
      ),
    );
  }

  Widget _buildViewModeSelector(AppPalette palette, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _buildViewModeButton('Month', CalendarViewMode.month, palette, theme),
          const SizedBox(width: 8),
          _buildViewModeButton('Week', CalendarViewMode.week, palette, theme),
          const SizedBox(width: 8),
          _buildViewModeButton('Day', CalendarViewMode.day, palette, theme),
        ],
      ),
    );
  }

  Widget _buildViewModeButton(
    String label,
    CalendarViewMode mode,
    AppPalette palette,
    ThemeData theme,
  ) {
    final isSelected = _viewMode == mode;
    return OutlinedButton(
      onPressed: () => setState(() => _viewMode = mode),
      style: OutlinedButton.styleFrom(
        backgroundColor: isSelected ? AppColors.primary : Colors.transparent,
        foregroundColor: isSelected ? Colors.white : palette.textPrimary,
        side: BorderSide(
          color: isSelected ? AppColors.primary : palette.divider,
        ),
      ),
      child: Text(label),
    );
  }

  Widget _buildCalendarView(
    BuildContext context,
    AppPalette palette,
    ThemeData theme,
    String timeZone,
  ) {
    switch (_viewMode) {
      case CalendarViewMode.month:
        return _buildMonthView(context, palette, theme);
      case CalendarViewMode.week:
        return _buildWeekView(context, palette, theme);
      case CalendarViewMode.day:
        return _buildDayView(context, palette, theme);
    }
  }

  Widget _buildMonthView(
    BuildContext context,
    AppPalette palette,
    ThemeData theme,
  ) {
    final firstDayOfMonth =
        DateTime(_focusedDate.year, _focusedDate.month, 1);
    final lastDayOfMonth =
        DateTime(_focusedDate.year, _focusedDate.month + 1, 0);
    final startDate = firstDayOfMonth.subtract(
      Duration(days: firstDayOfMonth.weekday % 7),
    );
    final endDate = lastDayOfMonth.add(
      Duration(days: 6 - (lastDayOfMonth.weekday % 7)),
    );

    final days = <DateTime>[];
    var current = startDate;
    while (current.isBefore(endDate) || current.isAtSameMomentAs(endDate)) {
      days.add(current);
      current = current.add(const Duration(days: 1));
    }

    return Column(
      children: [
        _buildWeekdayHeader(palette, theme),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1,
              crossAxisSpacing: 4,
              mainAxisSpacing: 4,
            ),
            itemCount: days.length,
            itemBuilder: (context, index) {
              final day = days[index];
              return _buildDayCell(day, palette, theme);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildWeekdayHeader(AppPalette palette, ThemeData theme) {
    final weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: weekdays.map((day) {
          return Expanded(
            child: Center(
              child: Text(
                day,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: palette.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDayCell(DateTime day, AppPalette palette, ThemeData theme) {
    final isToday = _isSameDay(day, DateTime.now());
    final isSelected = _isSameDay(day, _selectedDate);
    final isCurrentMonth = day.month == _focusedDate.month;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedDate = day;
        });
      },
      child: Container(
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : isToday
                  ? AppColors.primary.withValues(alpha: 0.1)
                  : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isToday && !isSelected
              ? Border.all(color: AppColors.primary, width: 2)
              : null,
        ),
        child: Center(
          child: Text(
            '${day.day}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: isSelected
                  ? Colors.white
                  : isCurrentMonth
                      ? palette.textPrimary
                      : palette.textSecondary.withValues(alpha: 0.5),
              fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWeekView(
    BuildContext context,
    AppPalette palette,
    ThemeData theme,
  ) {
    final startOfWeek = _selectedDate.subtract(
      Duration(days: _selectedDate.weekday % 7),
    );
    final days = List.generate(
      7,
      (index) => startOfWeek.add(Duration(days: index)),
    );

    return Column(
      children: [
        _buildWeekdayHeader(palette, theme),
        Expanded(
          child: Row(
            children: days.map((day) {
              return Expanded(
                child: _buildDayColumn(day, palette, theme),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildDayColumn(DateTime day, AppPalette palette, ThemeData theme) {
    final isToday = _isSameDay(day, DateTime.now());
    final isSelected = _isSameDay(day, _selectedDate);

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedDate = day;
        });
      },
      child: Container(
        margin: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isToday
              ? Border.all(color: AppColors.primary, width: 2)
              : Border.all(color: palette.divider),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                '${day.day}',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: isToday ? AppColors.primary : palette.textPrimary,
                  fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
            Expanded(
              child: Center(
                child: Text(
                  'Events',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDayView(
    BuildContext context,
    AppPalette palette,
    ThemeData theme,
  ) {
    final hours = List.generate(24, (index) => index);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            DateFormat('EEEE, MMMM d, yyyy').format(_selectedDate),
            style: theme.textTheme.titleLarge?.copyWith(
              color: palette.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: hours.length,
            itemBuilder: (context, index) {
              final hour = hours[index];
              return _buildHourRow(hour, palette, theme);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildHourRow(int hour, AppPalette palette, ThemeData theme) {
    final timeLabel = DateFormat('h a').format(
      DateTime(2000, 1, 1, hour),
    );

    return Container(
      height: 60,
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: palette.divider, width: 0.5),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 60,
            child: Padding(
              padding: const EdgeInsets.only(top: 4, right: 8),
              child: Text(
                timeLabel,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: palette.textSecondary,
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(color: palette.divider, width: 0.5),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFAB(BuildContext context, String timeZone) {
    final l10n = AppLocalizations.of(context);
    return AddCircleButton(
      semanticsLabel: l10n.dashboardCreateEventOrSignalLabel,
      semanticsHint: l10n.dashboardQuickCreateHint,
      onPressed: () {
        HapticFeedback.mediumImpact();
        context.push('/create-event', extra: _selectedDate);
      },
    );
  }

  void _previousPeriod() {
    setState(() {
      switch (_viewMode) {
        case CalendarViewMode.month:
          _focusedDate = DateTime(_focusedDate.year, _focusedDate.month - 1);
          break;
        case CalendarViewMode.week:
          _selectedDate = _selectedDate.subtract(const Duration(days: 7));
          _focusedDate = _selectedDate;
          break;
        case CalendarViewMode.day:
          _selectedDate = _selectedDate.subtract(const Duration(days: 1));
          _focusedDate = _selectedDate;
          break;
      }
    });
  }

  void _nextPeriod() {
    setState(() {
      switch (_viewMode) {
        case CalendarViewMode.month:
          _focusedDate = DateTime(_focusedDate.year, _focusedDate.month + 1);
          break;
        case CalendarViewMode.week:
          _selectedDate = _selectedDate.add(const Duration(days: 7));
          _focusedDate = _selectedDate;
          break;
        case CalendarViewMode.day:
          _selectedDate = _selectedDate.add(const Duration(days: 1));
          _focusedDate = _selectedDate;
          break;
      }
    });
  }

  void _goToToday() {
    setState(() {
      final today = DateTime.now();
      _selectedDate = today;
      _focusedDate = today;
    });
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
