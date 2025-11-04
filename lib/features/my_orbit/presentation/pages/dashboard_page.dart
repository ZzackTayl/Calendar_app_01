import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:myorbit_calendar/core/responsive_utils.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/features/notifications/presentation/cubit/notification_cubit.dart';
import 'package:myorbit_calendar/features/signals/domain/entities/availability_signal.dart';
import 'package:myorbit_calendar/features/signals/presentation/cubit/signal_cubit.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';
import 'package:myorbit_calendar/presentation/cubit/settings/settings_cubit.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_button.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_card.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_text.dart';
import 'package:myorbit_calendar/ui/widgets/add_circle_button.dart';

/// Dashboard Screen - BLoC version
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final settingsState = context.watch<SettingsCubit>().state;
    final timeZone = settingsState.settings.timeZone;
    final now = TimezoneService.nowIn(timeZone);

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
          minimum: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: SingleChildScrollView(
            controller: _scrollController,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 12),
                _buildActionButtons(context, timeZone),
                const SizedBox(height: 28),
                _buildGreeting(now),
                const SizedBox(height: 20),
                _buildCalendarCard(context, now, timeZone, palette),
                const SizedBox(height: 12),
                _buildEventsCard(context, now, palette),
                const SizedBox(height: 12),
                _buildSignalsCard(context, timeZone, palette),
                const SizedBox(height: 12),
                _buildBottomCards(context, palette),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final palette = AppPalette.of(context);
    final logoAsset =
        AppAssets.logoForBrightness(Theme.of(context).brightness);

    return Row(
      children: [
        Expanded(
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
                  child: Icon(
                    Icons.public,
                    color: palette.isDark
                        ? AppColors.textSecondaryDark
                        : Colors.blue,
                    size: 64,
                  ),
                );
              },
            ),
          ),
        ),
        _NotificationBell(),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context, String timeZone) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(left: 18),
      child: Row(
        children: [
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

  Widget _buildGreeting(DateTime now) {
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;
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
                  context.push('/create-event');
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.wifi_tethering),
                title: Text(
                  'Share availability signal',
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
                  context.push(
                    '/signal-availability',
                    extra: TimezoneService.nowIn(timeZone),
                  );
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCalendarCard(
    BuildContext context,
    DateTime now,
    String timeZone,
    AppPalette palette,
  ) {
    final textStyles = context.responsiveText;
    // TODO: Replace with EventsCubit when available
    final nextEvent = null; // Placeholder

    final nextEventTitle = nextEvent?.title ?? 'No upcoming events yet';
    final nextEventWindow = nextEvent != null
        ? TimezoneService.formatEventWindow(
            start: nextEvent.start,
            end: nextEvent.end,
            displayName: timeZone,
          )
        : null;
    final nextEventSubtitle = nextEventWindow != null
        ? '${nextEventWindow.dateLabel} • ${nextEventWindow.timeLabel}'
        : 'Add events to see them here';

    return SemanticCard(
      label: 'Calendar card',
      hint: nextEvent != null
          ? 'Next event ${nextEvent.title}, ${nextEventWindow!.timeLabel} on ${nextEventWindow.dateLabel}. Tap to view calendar.'
          : 'No events scheduled. Tap to add one.',
      isButton: true,
      onTap: () => context.push('/calendar'),
      child: GestureDetector(
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
                : _dayModeCardGradient(AppColors.cardDark, darkenAmount: 0.14),
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
                      style: textStyles.bodySmall.copyWith(color: Colors.white),
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

  Widget _buildEventsCard(
    BuildContext context,
    DateTime now,
    AppPalette palette,
  ) {
    final textStyles = context.responsiveText;
    // TODO: Replace with EventsCubit when available
    final eventsToday = 0;
    final eventsThisWeek = 0;

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

    return SemanticCard(
      label: 'Events card',
      hint: '$todayLabel, $weekLabel. Tap to view all events.',
      isButton: true,
      onTap: () => context.push('/events'),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.mediumImpact();
          context.push('/events');
        },
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: _maroonCardGradient(palette),
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
                    'icons/events_icon.webp',
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
                      style: textStyles.heading4.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      todayLabel,
                      style: textStyles.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      weekLabel,
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

  Widget _buildSignalsCard(
    BuildContext context,
    String timeZone,
    AppPalette palette,
  ) {
    final textStyles = context.responsiveText;
    final signalState = context.watch<SignalCubit>().state;
    
    // TODO: Filter signals properly when owner info is available
    final mySignals = signalState.signals;
    final sharedSignals = <AvailabilitySignal>[];

    return SemanticCard(
      label: 'Availability signals card',
      hint: 'View and manage availability signals',
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: palette.isDark
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
                )
              : _dayModeCardGradient(AppColors.eventPurple),
          border: _cardBorder(palette),
          borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
          boxShadow: AppShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Transform.translate(
                  offset: const Offset(-10, 0),
                  child: SemanticImage(
                    label: 'Signals section icon',
                    child: Image.asset(
                      'icons/signals_icon.webp',
                      width: 80,
                      height: 80,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Availability Signals',
                    style: textStyles.heading4.copyWith(color: Colors.white),
                  ),
                ),
              ],
            ),
            if (mySignals.isEmpty && sharedSignals.isEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'No active signals',
                style: textStyles.bodySmall.copyWith(
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
            ] else ...[
              const SizedBox(height: 16),
              if (mySignals.isNotEmpty)
                Text(
                  'My signals: ${mySignals.length}',
                  style: textStyles.bodySmall.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              if (sharedSignals.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  'Shared with me: ${sharedSignals.length}',
                  style: textStyles.bodySmall.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBottomCards(BuildContext context, AppPalette palette) {
    final textStyles = context.responsiveText;
    return Column(
      children: [
        _buildNavigationCard(
          context: context,
          title: 'My Orbit',
          icon: 'icons/Connections.webp',
          onTap: () => context.push('/people-groups'),
          palette: palette,
          textStyles: textStyles,
        ),
        const SizedBox(height: 12),
        _buildNavigationCard(
          context: context,
          title: 'Activity',
          icon: 'icons/activities_icon.webp',
          onTap: () => context.push('/activity'),
          palette: palette,
          textStyles: textStyles,
        ),
      ],
    );
  }

  Widget _buildNavigationCard({
    required BuildContext context,
    required String title,
    required String icon,
    required VoidCallback onTap,
    required AppPalette palette,
    required ResponsiveTextStyles textStyles,
  }) {
    return SemanticCard(
      label: '$title card',
      hint: 'Tap to view $title',
      isButton: true,
      onTap: onTap,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.mediumImpact();
          onTap();
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
                : _dayModeCardGradient(AppColors.cardDark),
            border: _cardBorder(palette),
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              Transform.translate(
                offset: const Offset(-10, 0),
                child: SemanticImage(
                  label: '$title icon',
                  child: Image.asset(
                    icon,
                    width: 80,
                    height: 80,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: textStyles.heading4.copyWith(color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Border? _cardBorder(AppPalette palette) {
    if (!palette.isDark) return null;
    return Border.all(
      color: AppColors.cardBorderBabyBlue,
      width: 1.5,
    );
  }

  LinearGradient _dayModeCardGradient(
    Color base, {
    double darkenAmount = 0.08,
  }) {
    final deeper = Color.lerp(base, Colors.black, darkenAmount) ?? base;
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [base, deeper],
    );
  }

  LinearGradient _maroonCardGradient(AppPalette palette) {
    if (palette.isDark) {
      return const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
      );
    }
    const base = AppColors.cardMaroon;
    final medium = Color.lerp(base, Colors.black, 0.22) ?? base;
    final dark = Color.lerp(base, Colors.black, 0.42) ?? medium;
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [base, medium, dark],
      stops: const [0.0, 0.58, 1.0],
    );
  }

  String _formatCount(
    int count, {
    required String singular,
    required String plural,
    required String zeroText,
  }) {
    if (count == 0) return zeroText;
    if (count == 1) return '1 $singular';
    return '$count $plural';
  }
}

class _NotificationBell extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final notificationState = context.watch<NotificationCubit>().state;
    final unreadCount = notificationState.notifications
        .where((n) => !n.isDismissed)
        .length;

    return SemanticButton(
      label: 'Notifications',
      hint: unreadCount > 0
          ? 'You have $unreadCount unread notification${unreadCount == 1 ? '' : 's'}'
          : 'No unread notifications',
      onPressed: () => context.push('/notifications'),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            iconSize: 28,
            onPressed: () {
              HapticFeedback.lightImpact();
              context.push('/notifications');
            },
          ),
          if (unreadCount > 0)
            Positioned(
              right: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
                constraints: const BoxConstraints(
                  minWidth: 16,
                  minHeight: 16,
                ),
                child: Text(
                  unreadCount > 9 ? '9+' : '$unreadCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
