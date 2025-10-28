import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../core/responsive_utils.dart';
import '../../core/timezone_service.dart';
import '../../domain/availability_signal.dart';
import '../../domain/contact.dart';
import '../../domain/event.dart';
import '../../domain/notification.dart' as app_notification;
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/providers/notification_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/signal_color_service.dart';
import '../../logic/services/signals_service.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_text.dart';
import '../widgets/availability/availability_signal_card.dart';
import '../widgets/add_circle_button.dart';
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
    final today = DateTime(now.year, now.month, now.day);
    final todaysEvents = ref.watch(eventsForDateProvider(today));
    final weekStart = _startOfWeek(today);
    final weekEvents = ref.watch(eventsForWeekProvider(weekStart));
    final upcomingEvents = ref.watch(upcomingEventsProvider);
    final nextEvent = upcomingEvents.isNotEmpty ? upcomingEvents.first : null;
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];
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
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                  )
                : AppGradients.backgroundFor(palette.brightness)),
        child: SafeArea(
          minimum: const EdgeInsets.fromLTRB(20, 16, 20, 16),
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
                const SizedBox(height: 20),
                _buildCalendarCard(context, nextEvent, now, timeZone, palette),
                const SizedBox(height: 12),
                _buildEventsCard(
                  context,
                  todaysEvents.length,
                  weekEvents.length,
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
                    contacts,
                  ),
                ),
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

    return Semantics(
      label: 'Dashboard header',
      container: true,
      explicitChildNodes: true,
      child: Row(
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
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, String timeZone) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(left: 18),
      child: Row(
        children: [
          // Screen reader: "Create event or signal, button. Opens quick create options"
          AddCircleButton(
            semanticsLabel: l10n.dashboardCreateEventOrSignalLabel,
            semanticsHint: l10n.dashboardQuickCreateHint,
            onPressed: () {
              HapticFeedback.mediumImpact();
              _showCreateQuickActionSheet(context, timeZone);
            },
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
    final textStyles = context.responsiveText;

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
            style: textStyles.heading2.copyWith(color: palette.textPrimary),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Here\'s what\'s happening',
          style: textStyles.bodyMedium.copyWith(color: palette.textSecondary),
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
        final palette = AppPalette.of(context);
        final textStyles = context.responsiveText;
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
                  style: textStyles.heading4.copyWith(
                    color: palette.textPrimary,
                  ),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.event),
                title: Text(
                  'Create event',
                  style: textStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: palette.textPrimary,
                  ),
                ),
                subtitle: Text(
                  'Plan time with your connections',
                  style: textStyles.bodySmall.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
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
                title: Text(
                  AppLocalizations.of(context).dashboardShareAvailabilitySignal,
                  style: textStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: palette.textPrimary,
                  ),
                ),
                subtitle: Text(
                  'Let partners know when you are available',
                  style: textStyles.bodySmall.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
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
    int eventsToday,
    int eventsThisWeek,
    AppPalette palette,
  ) {
    final textStyles = context.responsiveText;
    final todayLabel = _formatCount(
      eventsToday,
      singular: 'event today',
      plural: 'events today',
      zeroText: 'No events today',
    );
    final weekLabel = _formatCount(
      eventsThisWeek,
      singular: 'event this week',
      plural: 'events this week',
      zeroText: 'No events this week',
    );

    final todayMetricLabel = eventsToday == 0
        ? 'No events today'
        : '$eventsToday ${eventsToday == 1 ? 'event today' : 'events today'}';
    final weekMetricLabel = eventsThisWeek == 0
        ? 'No events this week'
        : '$eventsThisWeek ${eventsThisWeek == 1 ? 'event this week' : 'events this week'}';

    return SemanticCard(
      label: 'Events card',
      hint: '$todayLabel, $weekLabel. Tap to view all events and manage them.',
      isButton: true,
      onTap: () => context.push('/events'),
      child: GestureDetector(
        key: const Key('events_card'),
        onTap: () {
          HapticFeedback.mediumImpact();
          context.push('/events');
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
          child: Row(
            children: [
              Transform.translate(
                offset: const Offset(-10, 0),
                child: SemanticImage(
                  label: 'Events section icon',
                  child: Image.asset(
                    'icons/activities_icon_2.webp',
                    width: 80,
                    height: 80,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Events',
                      style:
                          textStyles.heading4.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      todayMetricLabel,
                      style: textStyles.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      weekMetricLabel,
                      style: textStyles.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
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

  Widget _buildCalendarCard(
    BuildContext context,
    CalendarEvent? nextEvent,
    DateTime now,
    String timeZone,
    AppPalette palette,
  ) {
    final textStyles = context.responsiveText;
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
    return SemanticCard(
      label: 'Calendar card',
      hint: event != null
          ? 'Next event ${event.title}, ${nextEventWindow!.timeLabel} on ${nextEventWindow.dateLabel}. Tap to view calendar.'
          : 'No events scheduled. Tap to add one.',
      isButton: true,
      onTap: () => context.push('/calendar'),
      child: GestureDetector(
        key: const Key('calendar_card'),
        onTap: () {
          HapticFeedback.mediumImpact();
          context.push('/calendar');
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
              Transform.translate(
                offset: const Offset(-10, 0),
                child: SemanticImage(
                  label: 'Calendar section icon',
                  child: Image.asset(
                    'icons/calendar_icon.webp',
                    width: 80,
                    height: 80,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Calendar',
                      style: textStyles.heading4.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventTitle,
                      style: textStyles.bodySmall.copyWith(
                        color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventSubtitle,
                      style: textStyles.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.85),
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
    List<Contact> contacts,
  ) {
    final textStyles = context.responsiveText;
    final l10n = AppLocalizations.of(context);
    final now = TimezoneService.nowIn(timeZone);
    bool isSignalActive(AvailabilitySignal signal) {
      final localizedStart = TimezoneService.convert(signal.startTime, timeZone);
      final localizedEnd = TimezoneService.convert(signal.endTime, timeZone);
      final hasStarted = !localizedStart.isAfter(now);
      final notEnded = localizedEnd.isAfter(now);
      return hasStarted && notEnded;
    }
    final availableConnectionsCount =
        sharedSignals.where(isSignalActive).length;
    final myActiveSignalsCount = mySignals.where(isSignalActive).length;
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

    final availableLabel =
        l10n.availabilityConnectionsAvailableCount(availableConnectionsCount);
    final myActiveLabel = l10n.availabilityMyActiveCount(myActiveSignalsCount);

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
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
                Transform.translate(
                  offset: const Offset(-10, 0),
                  child: SemanticImage(
                    label: 'Signals section icon',
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            AppColors.signalAvailable
                                .withValues(alpha: 0.22),
                            AppColors.signalAvailable
                                .withValues(alpha: 0.03),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.signalAvailable
                                .withValues(alpha: 0.18),
                            blurRadius: 30,
                            spreadRadius: 6,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'icons/availability.webp',
                          width: 72,
                          height: 72,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Signals',
                        style:
                            textStyles.heading4.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        availableLabel,
                        style: textStyles.bodySmall.copyWith(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontWeight: availableConnectionsCount == 0
                              ? FontWeight.w700
                              : null,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        myActiveLabel,
                        style: textStyles.bodySmall.copyWith(
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                // Chevron for accordion
                Icon(
                  _isSignalsExpanded ? Icons.expand_less : Icons.expand_more,
                  color: Colors.white,
                  size: 28,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Accordion content
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                const SizedBox(height: 16),
                if (highlightsToShow.isEmpty)
                  Text(
                    'No availability windows are active. Share a signal when you want your circle to reach out.',
                    style: textStyles.bodySmall.copyWith(
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                  )
                else
                  Column(
                    children: highlightsToShow
                        .map<Widget>(
                          (entry) => _SignalHighlightTile(
                            entry: entry,
                            timeZone: timeZone,
                            contacts: contacts,
                          ),
                        )
                        .toList(),
                  ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          context.push(
                            '/signal-availability',
                            extra: TimezoneService.nowIn(timeZone),
                          );
                        },
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.secondary,
                          foregroundColor: Colors.white,
                          textStyle: textStyles.buttonMedium
                              .copyWith(color: Colors.white),
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 16,
                          ),
                        ),
                        child: Text(
                          '+ add',
                          style: textStyles.buttonMedium
                              .copyWith(color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          context.push('/calendar');
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(
                              color: Colors.white.withValues(alpha: 0.4)),
                          textStyle: textStyles.buttonMedium
                              .copyWith(color: Colors.white),
                          alignment: Alignment.center,
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 16,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            'Calendar view',
                            style: textStyles.buttonMedium
                                .copyWith(color: Colors.white),
                          ),
                        ),
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

  Widget _buildBottomCards(BuildContext context, AppPalette palette) {
    final textStyles = context.responsiveText;
    return Column(
      children: [
        const SizedBox(height: 12),
        SemanticCard(
          label: 'Settings card',
          hint: 'Privacy and preferences. Tap to open settings',
          isButton: true,
          onTap: () => context.push('/settings'),
          child: GestureDetector(
            key: const Key('settings_card'),
            onTap: () {
              HapticFeedback.mediumImpact();
              context.push('/settings');
            },
            child: Container(
              width: double.infinity,
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Transform.translate(
                    offset: const Offset(-10, 0),
                    child: SemanticImage(
                      label: 'Settings section icon',
                      child: Image.asset(
                        'icons/settings_icon.webp',
                        width: 80,
                        height: 80,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Settings',
                          style:
                              textStyles.heading4.copyWith(color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Privacy &\npreferences',
                          style: textStyles.bodySmall.copyWith(
                            color: Colors.white,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
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
  const _SignalHighlightTile({
    required this.entry,
    required this.timeZone,
    required this.contacts,
  });

  final _DashboardSignalHighlight entry;
  final String timeZone;
  final List<Contact> contacts;

  @override
  Widget build(BuildContext context) {
    final signal = entry.signal;
    final localizedStart = TimezoneService.convert(signal.startTime, timeZone);
    final localizedEnd = TimezoneService.convert(signal.endTime, timeZone);
    final now = TimezoneService.nowIn(timeZone);
    final isOwn = entry.isOwn;
    final color = isOwn
        ? AppColors.signalAvailable
        : SignalColorService.getSignalColor(signal, contacts);
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
    final visibleCount = ref
        .watch(notificationListProvider)
        .when(
          data: computeNotificationCenterVisible,
          loading: () => const <app_notification.Notification>[],
          error: (_, __) => const <app_notification.Notification>[],
        )
        .length;

    final hint = unreadCount > 0
        ? '$unreadCount unread of $visibleCount total'
        : visibleCount > 0
            ? '$visibleCount notifications'
            : 'No notifications';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        SemanticIconButton(
          label: 'Notifications',
          hint: hint,
          icon: Icons.notifications,
          size: 44,
          color: Colors.transparent,
          onPressed: () {
            HapticFeedback.mediumImpact();
            context.push('/notifications');
          },
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: Center(
              child: Image.asset(
                'icons/notification_icon_wood.webp',
                width: 44,
                height: 44,
              ),
            ),
          ),
        ),
        if (visibleCount > 0)
          Positioned(
            top: 0,
            right: 0,
            child: _DashboardNotificationBadge(
              count: visibleCount,
              hasUnread: unreadCount > 0,
            ),
          ),
      ],
    );
  }
}

class _DashboardNotificationBadge extends StatelessWidget {
  const _DashboardNotificationBadge({
    required this.count,
    required this.hasUnread,
  });

  final int count;
  final bool hasUnread;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final isDark = palette.isDark;
    final badgeColor = isDark ? null : AppColors.secondary;
    final gradient =
        isDark ? AppGradients.backgroundFor(palette.brightness) : null;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.55)
        : Colors.white.withValues(alpha: 0.9);
    final textStyle = Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              height: 1.1,
            ) ??
        const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: 11,
          height: 1.1,
        );

    return Semantics(
      label: 'Notification badge',
      value: '$count items${hasUnread ? ', unread available' : ''}',
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: gradient,
          color: badgeColor,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: borderColor, width: 1),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.45)
                  : Colors.black.withValues(alpha: 0.18),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          child: Text(
            '$count',
            style: textStyle,
          ),
        ),
      ),
    );
  }
}
