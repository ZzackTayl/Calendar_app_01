import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../core/timezone_service.dart';
import '../../domain/availability_signal.dart';
import '../../domain/event.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/providers/notification_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/signals_service.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import '../widgets/availability/availability_signal_card.dart';
import 'create_event_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  bool _isSignalsExpanded = false;
  late ScrollController _scrollController;

  // Lazy loading visibility states for cards below fold
  bool _isSignalsVisible = true;
  bool _isBottomCardsVisible = true;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _scrollController.addListener(_updateVisibility);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_updateVisibility);
    _scrollController.dispose();
    super.dispose();
  }

  void _updateVisibility() {
    setState(() {
      // Estimate card positions (approximate based on typical sizes)
      _isSignalsVisible = true; // Always show signals
      _isBottomCardsVisible = true; // Always show bottom cards
    });
  }

  double _metricColumnWidth(double maxWidth) {
    final desired = maxWidth * 0.4;
    return desired.clamp(140.0, 220.0).toDouble();
  }

  Border? _cardBorder(AppPalette palette) {
    if (!palette.isDark) {
      return null;
    }
    return Border.all(
      color: AppColors.cardBorderBabyBlue,
      width: 1.5,
    );
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(settingsControllerProvider);
    final timeZone = settingsAsync.maybeWhen(
      data: (settings) => settings.timeZone,
      orElse: () => TimezoneService.defaultDisplayName,
    );
    final now = TimezoneService.nowIn(timeZone);
    final weekStart = _startOfWeek(now);
    final weekEvents = ref.watch(eventsForWeekProvider(weekStart));
    final upcomingEvents = ref.watch(upcomingEventsProvider);
    final nextEvent = upcomingEvents.isNotEmpty ? upcomingEvents.first : null;
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];

    final palette = AppPalette.of(context);

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
          minimum: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: SingleChildScrollView(
            controller: _scrollController,
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 12),
                _buildActionButtons(context, timeZone),
                const SizedBox(height: 28),
                _buildGreeting(),
                const SizedBox(height: 12),
                _buildCalendarCard(context, nextEvent, now, timeZone, palette),
                const SizedBox(height: 12),
                _buildEventsCard(
                  context,
                  weekEvents.length,
                  upcomingEvents.length,
                  palette,
                ),
                const SizedBox(height: 12),
                Visibility(
                  visible: _isSignalsVisible,
                  replacement: const SizedBox(height: 300),
                  child: _buildSignalsCard(
                    context,
                    mySignals,
                    sharedSignals,
                    timeZone,
                    palette,
                  ),
                ),
                const SizedBox(height: 12),
                Visibility(
                  visible: _isBottomCardsVisible,
                  replacement: const SizedBox(height: 150),
                  child: _buildBottomCards(context, palette),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final palette = AppPalette.of(context);
    final logoAsset = AppAssets.logoForBrightness(Theme.of(context).brightness);

    return Row(
      children: [
        // MyOrbit logo
        // Screen reader: "MyOrbit logo"
        Expanded(
          child: Semantics(
            label: 'MyOrbit logo',
            excludeSemantics: true,
            child: SemanticImage(
              label: 'MyOrbit logo',
              child: Image.asset(
                logoAsset,
                width: 128,
                height: 128,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: 128,
                    height: 128,
                    decoration: BoxDecoration(
                      color: palette.isDark
                          ? AppColors.textSecondaryDark.withValues(alpha: 0.2)
                          : Colors.blue.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.public,
                        color: palette.isDark
                            ? AppColors.textSecondaryDark
                            : Colors.blue,
                        size: 64),
                  );
                },
              ),
            ),
          ),
        ),
        // Notification bell - right column
        // Screen reader: "Notifications, button. You have unread notifications"
        NotificationBellWithBadge(),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context, String timeZone) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: Row(
        children: [
          // Screen reader: "Create event or signal, button. Opens quick create options"
          SemanticButton(
            label: 'Create event or signal',
            hint: 'Opens quick create options',
            onPressed: () {
              HapticFeedback.mediumImpact();
              _showCreateQuickActionSheet(context, timeZone);
            },
            child: SizedBox(
              width: 56,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  _showCreateQuickActionSheet(context, timeZone);
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
    );
  }

  Widget _buildGreeting() {
    final settingsAsync = ref.watch(settingsControllerProvider);
    final timeZone = settingsAsync.maybeWhen(
      data: (settings) => settings.timeZone,
      orElse: () => TimezoneService.defaultDisplayName,
    );
    final now = TimezoneService.nowIn(timeZone);
    final palette = AppPalette.of(context);

    // Determine greeting based on time of day
    final hour = now.hour;
    String greeting;

    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good evening';
    } else {
      greeting = 'Good night';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Screen reader: Dynamic greeting based on time of day
        SemanticHeading(
          label: greeting,
          child: Text(
            '$greeting!',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: palette.textPrimary,
                ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Here\'s what\'s happening',
          style: TextStyle(
            fontSize: 16,
            color: palette.textSecondary,
          ),
        ),
      ],
    );
  }

  void _showCreateQuickActionSheet(BuildContext context, String timeZone) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Text(
                  'Quick create',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.event),
                title: const Text('Create event'),
                subtitle: const Text('Plan time with your connections'),
                onTap: () {
                  HapticFeedback.selectionClick();
                  Navigator.of(sheetContext).pop();
                  if (mounted) {
                    _showCreateEventDialog(context);
                  }
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.wifi_tethering),
                title: const Text('Share availability signal'),
                subtitle:
                    const Text('Let partners know when you are available'),
                onTap: () {
                  HapticFeedback.selectionClick();
                  Navigator.of(sheetContext).pop();
                  if (mounted) {
                    context.push(
                      '/signal-availability',
                      extra: TimezoneService.nowIn(timeZone),
                    );
                  }
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEventsCard(
    BuildContext context,
    int eventsThisWeek,
    int upcomingCount,
    AppPalette palette,
  ) {
    final weekLabel = _formatCount(
      eventsThisWeek,
      singular: 'event this week',
      plural: 'events this week',
      zeroText: 'No events this week',
    );

    final upcomingLabel = _formatCount(
      upcomingCount,
      singular: 'upcoming event',
      plural: 'upcoming events',
      zeroText: 'No upcoming events',
    );

    final weekMetricLabel = eventsThisWeek == 0
        ? 'No events this week'
        : '$eventsThisWeek ${eventsThisWeek == 1 ? 'event this week' : 'events this week'}';
    final upcomingMetricLabel = upcomingCount == 0
        ? 'Add an upcoming event'
        : '$upcomingCount ${upcomingCount == 1 ? 'upcoming event' : 'upcoming events'}';

    return SemanticCard(
      label: 'Events card',
      hint:
          '$weekLabel, $upcomingLabel. Tap to view all events and manage them.',
      isButton: true,
      onTap: () => context.go('/events'),
      child: GestureDetector(
        key: const Key('events_card'),
        onTap: () {
          HapticFeedback.mediumImpact();
          context.go('/events');
        },
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
                  )
                : null,
            color: palette.isDark ? null : AppColors.cardBlue,
            border: _cardBorder(palette),
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final metricWidth = _metricColumnWidth(constraints.maxWidth);
              return Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Events',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Create and manage events',
                          style: TextStyle(
                            fontSize: 15,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: metricWidth,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            weekMetricLabel,
                            style: TextStyle(
                              fontSize: 15,
                              color: Colors.white.withValues(alpha: 0.9),
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.right,
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            upcomingMetricLabel,
                            style: TextStyle(
                              fontSize: 15,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                            textAlign: TextAlign.right,
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
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

  Widget _buildCalendarCard(
    BuildContext context,
    CalendarEvent? nextEvent,
    DateTime now,
    String timeZone,
    AppPalette palette,
  ) {
    final event = nextEvent;
    final nextEventTitle = event?.title ?? 'No upcoming events yet';
    final nextEventWindow = event != null
        ? TimezoneService.formatEventWindow(
            start: event.start,
            end: event.end,
            displayName: timeZone,
          )
        : null;
    final nextEventSubtitle = nextEventWindow != null
        ? '${nextEventWindow.dateLabel} • ${nextEventWindow.timeLabel}'
        : 'Add events to see them here';
    final zoneAbbrev =
        TimezoneService.abbreviationFor(timeZone, reference: now);

    return SemanticCard(
      label: 'Calendar card',
      hint: event != null
          ? 'Next event ${event.title}, ${nextEventWindow!.timeLabel} on ${nextEventWindow.dateLabel}. Tap to view calendar.'
          : 'No events scheduled. Tap to add one.',
      isButton: true,
      onTap: () => context.go('/calendar'),
      child: GestureDetector(
        key: const Key('calendar_card'),
        onTap: () {
          HapticFeedback.mediumImpact();
          context.go('/calendar');
        },
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
                  )
                : null,
            color: palette.isDark ? null : AppColors.cardMaroon,
            border: _cardBorder(palette),
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Calendar',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventTitle,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventSubtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$timeZone ($zoneAbbrev)',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSignalsCard(
    BuildContext context,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    String timeZone,
    AppPalette palette,
  ) {
    final totalSignals = mySignals.length + sharedSignals.length;
    final now = TimezoneService.nowIn(timeZone);
    final combinedHighlights = <_DashboardSignalHighlight>[
      ...mySignals.map(
        (signal) => _DashboardSignalHighlight(signal: signal, isOwn: true),
      ),
      ...sharedSignals.map(
        (signal) => _DashboardSignalHighlight(signal: signal, isOwn: false),
      ),
    ]
      ..retainWhere((entry) => entry.signal.endTime.isAfter(now))
      ..sort((a, b) => a.signal.startTime.compareTo(b.signal.startTime));
    final highlightsToShow = combinedHighlights.take(3).toList();

    final label = totalSignals == 0
        ? 'No active signals yet'
        : '$totalSignals signal${totalSignals == 1 ? '' : 's'} active';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: palette.isDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
              )
            : null,
        color: palette.isDark ? null : AppColors.cardDark,
        border: _cardBorder(palette),
        borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with chevron for accordion
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              setState(() {
                _isSignalsExpanded = !_isSignalsExpanded;
              });
            },
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Availability',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 15,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                ),
                // Chevron for accordion
                Icon(
                  _isSignalsExpanded ? Icons.expand_less : Icons.expand_more,
                  color: Colors.white,
                  size: 28,
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildSummaryChip(
                label: '${mySignals.length} mine',
                color: AppColors.signalAvailable,
              ),
              _buildSummaryChip(
                label: '${sharedSignals.length} connection',
                color: AppColors.signalShared,
              ),
            ],
          ),
          // Accordion content
          AnimatedCrossFade(
            firstChild: const SizedBox(height: 18),
            secondChild: Column(
              children: [
                const SizedBox(height: 16),
                if (highlightsToShow.isEmpty)
                  Text(
                    'No availability windows are active. Share a signal when you want your circle to reach out.',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                  )
                else
                  Column(
                    children: highlightsToShow
                        .map(
                          (entry) => _SignalHighlightTile(
                            entry: entry,
                            timeZone: timeZone,
                          ),
                        )
                        .toList(),
                  ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          context.push(
                            '/signal-availability',
                            extra: TimezoneService.nowIn(timeZone),
                          );
                        },
                        icon: const Icon(Icons.add_circle_outline),
                        label: const Text('Share availability'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.secondary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 16,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          context.go('/calendar');
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(
                              color: Colors.white.withValues(alpha: 0.4)),
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 16,
                          ),
                        ),
                        child: const Text('Calendar view'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            crossFadeState: _isSignalsExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryChip({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildBottomCards(BuildContext context, AppPalette palette) {
    return Row(
      children: [
        // Screen reader: "Settings card, button. Privacy and preferences. Tap to open settings"
        Expanded(
          child: SemanticCard(
            label: 'Settings card',
            hint: 'Privacy and preferences. Tap to open settings',
            isButton: true,
            onTap: () => context.go('/settings'),
            child: GestureDetector(
              key: const Key('settings_card'),
              onTap: () {
                HapticFeedback.mediumImpact();
                context.go('/settings');
              },
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: palette.isDark
                      ? const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
                        )
                      : null,
                  color: palette.isDark ? null : AppColors.cardMaroon,
                  border: _cardBorder(palette),
                  borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Settings',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Privacy &\npreferences',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Screen reader: "Updates and Guides card, button. Tips and tutorials. Tap to view guides"
        Expanded(
          child: SemanticCard(
            label: 'Updates and Guides card',
            hint: 'Tips and tutorials. Tap to view guides',
            isButton: true,
            onTap: () => context.go('/updates-guides'),
            child: GestureDetector(
              key: const Key('updates_guides_card'),
              onTap: () {
                HapticFeedback.mediumImpact();
                context.go('/updates-guides');
              },
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: palette.isDark
                      ? const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
                        )
                      : null,
                  color: palette.isDark ? null : AppColors.cardBlue,
                  border: _cardBorder(palette),
                  borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Updates &\nGuides',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tips &\ntutorials',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  DateTime _startOfWeek(DateTime date) {
    final difference = date.weekday % 7;
    final start = date.subtract(Duration(days: difference));
    return DateTime(start.year, start.month, start.day);
  }

  String _formatCount(
    int count, {
    required String singular,
    required String plural,
    String? zeroText,
  }) {
    if (count == 0) {
      return zeroText ?? 'No $plural';
    }
    if (count == 1) {
      return '1 $singular';
    }
    return '$count $plural';
  }

  /// Show create event dialog as a modal
  void _showCreateEventDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateEventScreen(),
    );
  }
}

class _DashboardSignalHighlight {
  const _DashboardSignalHighlight({required this.signal, required this.isOwn});

  final AvailabilitySignal signal;
  final bool isOwn;
}

class _SignalHighlightTile extends StatelessWidget {
  const _SignalHighlightTile({required this.entry, required this.timeZone});

  final _DashboardSignalHighlight entry;
  final String timeZone;

  @override
  Widget build(BuildContext context) {
    final signal = entry.signal;
    final localizedStart = TimezoneService.convert(signal.startTime, timeZone);
    final localizedEnd = TimezoneService.convert(signal.endTime, timeZone);
    final now = TimezoneService.nowIn(timeZone);
    final isOwn = entry.isOwn;
    final color = isOwn ? AppColors.signalAvailable : AppColors.signalShared;
    final ownerName = isOwn
        ? 'You'
        : DevDataService.getMockUserById(signal.userId)?.displayName ??
            'Connection';

    final active = SignalsService.isSignalActive(signal);
    final status = active
        ? 'Active • ${_dashboardFriendlyDuration(signal.endTime.difference(now))} left'
        : localizedStart.isAfter(now)
            ? 'Starts in ${_dashboardFriendlyDuration(localizedStart.difference(now))}'
            : 'Recently ended';

    final dateFormat = DateFormat('EEE, MMM d');
    final timeFormat = DateFormat('h:mm a');
    final startLabel =
        '${timeFormat.format(localizedStart)} • ${dateFormat.format(localizedStart)}';
    final duration = localizedEnd.difference(localizedStart);
    final isPersistent = duration.inDays >= 365;
    final endLabel = isPersistent
        ? 'Until turned off'
        : '${timeFormat.format(localizedEnd)} • ${dateFormat.format(localizedEnd)}';
    final timeRangeLabel = '$startLabel → $endLabel';

    return AvailabilitySignalCard(
      accentColor: color,
      ownerName: ownerName,
      timeRangeLabel: timeRangeLabel,
      statusLabel: status,
      message: signal.message,
      leadingIcon: isOwn ? Icons.wifi_tethering_rounded : Icons.people_outline,
      isOnDarkBackground: true,
    );
  }
}

String _dashboardFriendlyDuration(Duration duration) {
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

/// Notification bell icon with unread count badge
class NotificationBellWithBadge extends ConsumerWidget {
  const NotificationBellWithBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCount = ref.watch(unreadNotificationCountProvider);

    return Badge(
      isLabelVisible: unreadCount > 0,
      label: Text('$unreadCount'),
      alignment: AlignmentDirectional.topEnd,
      offset: const Offset(-6, -6),
      child: SemanticIconButton(
        label: 'Notifications',
        hint: 'You have unread notifications',
        icon: Icons.notifications,
        size: 44,
        color: Theme.of(context).colorScheme.onSurface,
        onPressed: () {
          HapticFeedback.mediumImpact();
          context.go('/notifications');
        },
        enabled: true,
      ),
    );
  }
}
