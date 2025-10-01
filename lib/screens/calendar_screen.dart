import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';

import '../providers/event_provider.dart';
import '../widgets/add_event_dialog.dart';

enum CalendarViewMode { month, week, day }

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  static const _backgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
  );

  static const _calendarCardRadius = 28.0;
  static const _markerPalette = <Color>[
    Color(0xFF26C281),
    Color(0xFF7C3BFF),
    Color(0xFFFFB347),
    Color(0xFF4D8CFF),
  ];

  CalendarViewMode _viewMode = CalendarViewMode.month;
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDate = DateTime.now();
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final provider = context.read<EventProvider>();
      provider.setSelectedDate(_selectedDate);
      provider.setFocusedDate(_focusedDate);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FF),
      body: Container(
        decoration: const BoxDecoration(gradient: _backgroundGradient),
        child: SafeArea(
          child: Consumer<EventProvider>(
            builder: (context, eventProvider, _) {
              final eventsForSelectedDate =
                  eventProvider.getEventsForDate(_selectedDate);

              return Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildTopBar(context),
                          const SizedBox(height: 24),
                          _buildMonthNavigator(eventProvider),
                          const SizedBox(height: 20),
                          _buildViewToggle(),
                          const SizedBox(height: 20),
                          _buildCalendarCard(eventProvider),
                          const SizedBox(height: 28),
                          _buildScheduleSection(
                            context,
                            eventsForSelectedDate,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Row(
      children: [
        TextButton.icon(
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushReplacementNamed(context, '/dashboard');
            }
          },
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFF1E2A3B),
            textStyle:
                const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          label: const Text('Back'),
        ),
        const Spacer(),
        TextButton.icon(
          onPressed: () => _showAddEventDialog(context),
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFF1E2A3B),
            textStyle:
                const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          icon: const Icon(Icons.add, size: 20),
          label: const Text('New'),
        ),
      ],
    );
  }

  Widget _buildMonthNavigator(EventProvider provider) {
    final monthLabel = DateFormat('MMMM yyyy').format(_focusedDate);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(
          onPressed: () {
            final previousMonth =
                DateTime(_focusedDate.year, _focusedDate.month - 1, 1);
            setState(() {
              _focusedDate = previousMonth;
            });
            provider.setFocusedDate(previousMonth);
          },
          icon: const Icon(Icons.chevron_left, color: Color(0xFF1F2C3E)),
        ),
        const SizedBox(width: 8),
        Text(
          monthLabel,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1F2C3E),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          onPressed: () {
            final nextMonth =
                DateTime(_focusedDate.year, _focusedDate.month + 1, 1);
            setState(() {
              _focusedDate = nextMonth;
            });
            provider.setFocusedDate(nextMonth);
          },
          icon: const Icon(Icons.chevron_right, color: Color(0xFF1F2C3E)),
        ),
      ],
    );
  }

  Widget _buildViewToggle() {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.75),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: CalendarViewMode.values.map((mode) {
            final isSelected = _viewMode == mode;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: ChoiceChip(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                selectedColor: Colors.white,
                backgroundColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: Icon(
                        mode == CalendarViewMode.month
                            ? Icons.calendar_today_rounded
                            : mode == CalendarViewMode.week
                                ? Icons.view_week_rounded
                                : Icons.view_day_rounded,
                        size: 18,
                      ),
                    ),
                    Text(_viewModeLabel(mode)),
                  ],
                ),
                labelStyle: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isSelected
                      ? const Color(0xFF1F2C3E)
                      : const Color(0xFF6F7B8D),
                ),
                selected: isSelected,
                onSelected: (_) => _changeView(mode),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCalendarCard(EventProvider provider) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(_calendarCardRadius),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A1F2C3E),
            blurRadius: 32,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        child: TableCalendar<CalendarEvent>(
          firstDay: DateTime.utc(2020, 1, 1),
          lastDay: DateTime.utc(2035, 12, 31),
          focusedDay: _focusedDate,
          selectedDayPredicate: (day) => isSameDay(_selectedDate, day),
          calendarFormat: _calendarFormat,
          availableCalendarFormats: const {
            CalendarFormat.month: 'Month',
            CalendarFormat.week: 'Week',
          },
          headerVisible: false,
          startingDayOfWeek: StartingDayOfWeek.sunday,
          onDaySelected: (selectedDay, focusedDay) {
            setState(() {
              _selectedDate = selectedDay;
              _focusedDate = focusedDay;
            });
            provider.setSelectedDate(selectedDay);
            provider.setFocusedDate(focusedDay);
          },
          onPageChanged: (focusedDay) {
            if (!_isSameMonth(focusedDay, _focusedDate)) {
              setState(() {
                _focusedDate = focusedDay;
              });
            }
            provider.setFocusedDate(focusedDay);
          },
          onFormatChanged: (format) {
            if (_calendarFormat == format) return;
            setState(() {
              _calendarFormat = format;
            });
          },
          eventLoader: provider.getEventsForDate,
          calendarBuilders: CalendarBuilders(
            todayBuilder: (context, day, focusedDay) => _buildDayCell(
              day,
              isToday: true,
              isSelected: isSameDay(day, _selectedDate),
            ),
            selectedBuilder: (context, day, focusedDay) => _buildDayCell(
              day,
              isSelected: true,
            ),
            defaultBuilder: (context, day, focusedDay) => _buildDayCell(day),
            outsideBuilder: (context, day, focusedDay) => _buildDayCell(
              day,
              isOutside: true,
            ),
            markerBuilder: (context, day, events) {
              if (events.isEmpty) return const SizedBox.shrink();
              final markerCount = events.length > 3 ? 3 : events.length;
              return Positioned(
                bottom: 6,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(
                    markerCount,
                    (index) => Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      decoration: BoxDecoration(
                        color: _markerPalette[index % _markerPalette.length],
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          calendarStyle: CalendarStyle(
            outsideDaysVisible: true,
            isTodayHighlighted: true,
            defaultTextStyle: const TextStyle(
              color: Color(0xFF1F2C3E),
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
            weekendTextStyle: const TextStyle(
              color: Color(0xFF1F2C3E),
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
            disabledTextStyle: const TextStyle(color: Color(0xFFCED3E0)),
            outsideTextStyle: const TextStyle(color: Color(0xFFCBD1DD)),
            selectedDecoration: BoxDecoration(
              color: const Color(0xFF4D8CFF),
              borderRadius: BorderRadius.circular(16),
            ),
            selectedTextStyle: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
            todayDecoration: BoxDecoration(
              color: const Color(0x334D8CFF),
              borderRadius: BorderRadius.circular(16),
            ),
            todayTextStyle: const TextStyle(
              color: Color(0xFF4D8CFF),
              fontWeight: FontWeight.w700,
            ),
          ),
          daysOfWeekStyle: const DaysOfWeekStyle(
            weekdayStyle: TextStyle(
              color: Color(0xFF7B8699),
              fontWeight: FontWeight.w600,
            ),
            weekendStyle: TextStyle(
              color: Color(0xFF7B8699),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildScheduleSection(
    BuildContext context,
    List<CalendarEvent> events,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF101C32),
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33101C32),
            blurRadius: 28,
            offset: Offset(0, 18),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Schedule',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => _showAddEventDialog(context),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: Color(0xFF265DFF),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (events.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 18),
              decoration: BoxDecoration(
                color: const Color(0xFF172645),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    DateFormat('EEEE, MMM d').format(_selectedDate),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'No events yet. Tap the plus button to add one.',
                    style: TextStyle(
                      color: Color(0xFF9BA8C5),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: events.asMap().entries.map((entry) {
                final event = entry.value;
                final accentColor =
                    _markerPalette[entry.key % _markerPalette.length];
                return Padding(
                  padding: EdgeInsets.only(
                      bottom: entry.key == events.length - 1 ? 0 : 16),
                  child: _buildEventCard(event, accentColor),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildEventCard(CalendarEvent event, Color accentColor) {
    final timeLabel = event.time != null && event.time!.isNotEmpty
        ? event.time!
        : DateFormat('h:mm a').format(event.date);
    final dateLabel = DateFormat('EEE, MMM d').format(event.date);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            accentColor.withOpacity(0.18),
            Colors.white.withOpacity(0.92)
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [accentColor, accentColor.withOpacity(0.75)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.favorite_rounded, color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        event.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F1C2E),
                        ),
                      ),
                    ),
                    Icon(Icons.groups_rounded,
                        color: accentColor.withOpacity(0.9)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '$timeLabel • $dateLabel',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF3D4D63),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (event.description != null && event.description!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      event.description!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF5A6B84),
                        height: 1.4,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayCell(
    DateTime day, {
    bool isSelected = false,
    bool isToday = false,
    bool isOutside = false,
  }) {
    final textStyle = TextStyle(
      color: isOutside
          ? const Color(0xFFCBD1DD)
          : isSelected
              ? Colors.white
              : const Color(0xFF1F2C3E),
      fontWeight: FontWeight.w700,
      fontSize: 18,
    );

    final cell = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      decoration: BoxDecoration(
        color: isSelected
            ? const Color(0xFF4D8CFF)
            : isToday
                ? const Color(0x1A4D8CFF)
                : Colors.transparent,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Center(
        child: Text('${day.day}', style: textStyle),
      ),
    );

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onDoubleTap: () => _showDayDetails(day),
      child: cell,
    );
  }

  String _viewModeLabel(CalendarViewMode mode) {
    switch (mode) {
      case CalendarViewMode.month:
        return 'Month';
      case CalendarViewMode.week:
        return 'Week';
      case CalendarViewMode.day:
        return 'Day';
    }
  }

  void _changeView(CalendarViewMode mode) {
    setState(() {
      _viewMode = mode;
      switch (mode) {
        case CalendarViewMode.month:
          _calendarFormat = CalendarFormat.month;
          break;
        case CalendarViewMode.week:
          _calendarFormat = CalendarFormat.week;
          break;
        case CalendarViewMode.day:
          _calendarFormat = CalendarFormat.week;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Day view coming soon. Showing week view for now.'),
            ),
          );
          break;
      }
    });
  }

  bool _isSameMonth(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month;
  }

  void _showAddEventDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AddEventDialog(
          selectedDate: _selectedDate,
          onEventAdded: () {
            setState(() {});
          },
        );
      },
    );
  }

  void _showDayDetails(DateTime date) {
    final provider = context.read<EventProvider>();
    final events = provider.getEventsForDate(date);

    if (events.isEmpty) {
      // No events: offer to add one
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) {
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  DateFormat('EEEE, MMM d, yyyy').format(date),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                const Text('No events for this day.'),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('Add event'),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _selectedDate = date;
                      _showAddEventDialog(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF265DFF),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          );
        },
      );
      return;
    }

    // Show full details: list all events with expanded info
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          minChildSize: 0.4,
          maxChildSize: 0.95,
          builder: (_, scrollController) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        DateFormat('EEEE, MMM d, yyyy').format(date),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          _selectedDate = date;
                          _showAddEventDialog(context);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: ListView.builder(
                      controller: scrollController,
                      itemCount: events.length,
                      itemBuilder: (context, index) {
                        final e = events[index];
                        final accentColor =
                            _markerPalette[index % _markerPalette.length];
                        return _buildEventCard(e, accentColor);
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
