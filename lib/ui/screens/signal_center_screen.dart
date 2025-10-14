import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../domain/availability_signal.dart';
import '../../domain/enums.dart';
import '../../domain/signal_share.dart';
import '../../domain/signal_timeline_entry.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/signals_service.dart';

enum _SignalCenterSection { active, scheduled, history }

class SignalCenterScreen extends ConsumerStatefulWidget {
  const SignalCenterScreen({super.key});

  @override
  ConsumerState<SignalCenterScreen> createState() => _SignalCenterScreenState();
}

class _SignalCenterScreenState extends ConsumerState<SignalCenterScreen> {
  _SignalCenterSection _section = _SignalCenterSection.active;
  bool _showMine = true;
  bool _showShared = true;

  @override
  Widget build(BuildContext context) {
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final sharesAsync = ref.watch(signalSharesProvider);

    final mySignals = mySignalsAsync.asData?.value;
    final sharedSignals = sharedSignalsAsync.asData?.value;
    final shares = sharesAsync.asData?.value;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        title: const Text(
          'Availability Signals',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: mySignals == null || sharedSignals == null || shares == null
              ? const Center(child: CircularProgressIndicator())
              : _buildBody(context, mySignals, sharedSignals, shares),
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    List<SignalShare> shares,
  ) {
    final now = DateTime.now();
    final activeShared = sharedSignals
        .where((signal) => SignalsService.isSignalActive(signal))
        .toList();
    final timeline = DevDataService.getMockSignalTimeline()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

    final allSignals = DevDataService.getMockSignals();
    final upcomingSignals = allSignals
        .where((signal) => signal.startTime.isAfter(now))
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    final upcomingOwn = upcomingSignals
        .where((signal) => signal.userId == DevDataService.currentUserId)
        .toList();
    final sharedSignalIds = shares
        .where(
            (share) => share.sharedWithUserId == DevDataService.currentUserId)
        .map((share) => share.signalId)
        .toSet();
    final upcomingShared = upcomingSignals
        .where((signal) => sharedSignalIds.contains(signal.id))
        .toList();

    final activeCount = mySignals.length + activeShared.length;
    final scheduledCount = upcomingOwn.length + upcomingShared.length;
    final sharedTotal = shares
        .where((share) => share.sharedByUserId == DevDataService.currentUserId)
        .length;

    final content = _buildSectionContent(
      context,
      mySignals: mySignals,
      sharedActive: activeShared,
      upcomingOwn: upcomingOwn,
      upcomingShared: upcomingShared,
      timeline: timeline,
    );

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildStatCard(
                    label: 'Active now',
                    value: activeCount,
                    color: AppColors.signalAvailable,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    label: 'Scheduled',
                    value: scheduledCount,
                    color: AppColors.signalShared,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    label: 'Shared today',
                    value: sharedTotal,
                    color: AppColors.eventOrange,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SegmentedButton<_SignalCenterSection>(
                segments: const [
                  ButtonSegment(
                    value: _SignalCenterSection.active,
                    label: Text('Active'),
                    icon: Icon(Icons.wifi_tethering_rounded),
                  ),
                  ButtonSegment(
                    value: _SignalCenterSection.scheduled,
                    label: Text('Scheduled'),
                    icon: Icon(Icons.schedule),
                  ),
                  ButtonSegment(
                    value: _SignalCenterSection.history,
                    label: Text('History'),
                    icon: Icon(Icons.auto_graph),
                  ),
                ],
                selected: {_section},
                onSelectionChanged: (value) {
                  setState(() {
                    _section = value.first;
                  });
                },
                showSelectedIcon: false,
                style: ButtonStyle(
                  backgroundColor: WidgetStateProperty.resolveWith((states) {
                    return states.contains(WidgetState.selected)
                        ? Colors.white
                        : Colors.white.withValues(alpha: 0.3);
                  }),
                  foregroundColor: WidgetStateProperty.resolveWith((states) {
                    return states.contains(WidgetState.selected)
                        ? AppColors.textPrimary
                        : AppColors.textSecondary;
                  }),
                ),
              ),
              if (_section != _SignalCenterSection.history) ...[
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  children: [
                    FilterChip(
                      label: const Text('My signals'),
                      selected: _showMine,
                      onSelected: (value) {
                        setState(() {
                          _showMine = value;
                        });
                      },
                    ),
                    FilterChip(
                      label: const Text('Shared with me'),
                      selected: _showShared,
                      onSelected: (value) {
                        setState(() {
                          _showShared = value;
                        });
                      },
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundWhite.withValues(alpha: 0.9),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppBorderRadius.xxLarge),
                topRight: Radius.circular(AppBorderRadius.xxLarge),
              ),
            ),
            child: content,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => context.push('/signal-availability',
                      extra: DateTime.now()),
                  icon: const Icon(Icons.wifi_tethering_rounded),
                  label: const Text('Share availability'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.signalAvailable,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.push('/settings'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: const BorderSide(color: AppColors.textSecondary),
                  ),
                  child: const Text('Signal preferences'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSectionContent(
    BuildContext context, {
    required List<AvailabilitySignal> mySignals,
    required List<AvailabilitySignal> sharedActive,
    required List<AvailabilitySignal> upcomingOwn,
    required List<AvailabilitySignal> upcomingShared,
    required List<SignalTimelineEntry> timeline,
  }) {
    const listPadding = EdgeInsets.fromLTRB(20, 12, 20, 140);

    switch (_section) {
      case _SignalCenterSection.active:
        final entries = <_SignalListEntry>[];
        if (_showMine) {
          entries.addAll(
            mySignals
                .map((signal) => _SignalListEntry(signal: signal, isOwn: true)),
          );
        }
        if (_showShared) {
          entries.addAll(
            sharedActive.map(
                (signal) => _SignalListEntry(signal: signal, isOwn: false)),
          );
        }
        entries.sort((a, b) => a.signal.endTime.compareTo(b.signal.endTime));

        if (entries.isEmpty) {
          return _buildEmptyState(
            title: 'No active signals',
            description:
                'Share availability or accept partner signals to see live windows here.',
            icon: Icons.wifi_off,
          );
        }

        return ListView.separated(
          padding: listPadding,
          physics: const BouncingScrollPhysics(),
          itemBuilder: (context, index) => _buildSignalTile(
            entry: entries[index],
            isScheduledView: false,
          ),
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemCount: entries.length,
        );

      case _SignalCenterSection.scheduled:
        final entries = <_SignalListEntry>[];
        if (_showMine) {
          entries.addAll(
            upcomingOwn
                .map((signal) => _SignalListEntry(signal: signal, isOwn: true)),
          );
        }
        if (_showShared) {
          entries.addAll(
            upcomingShared.map(
                (signal) => _SignalListEntry(signal: signal, isOwn: false)),
          );
        }
        entries
            .sort((a, b) => a.signal.startTime.compareTo(b.signal.startTime));

        if (entries.isEmpty) {
          return _buildEmptyState(
            title: 'No upcoming signals',
            description:
                'Schedule future availability windows so partners can plan ahead.',
            icon: Icons.schedule_outlined,
          );
        }

        return ListView.separated(
          padding: listPadding,
          physics: const BouncingScrollPhysics(),
          itemBuilder: (context, index) => _buildSignalTile(
            entry: entries[index],
            isScheduledView: true,
          ),
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemCount: entries.length,
        );

      case _SignalCenterSection.history:
        final filteredTimeline = timeline.where((entry) {
          if (!_showMine && entry.isOwner) return false;
          if (!_showShared && !entry.isOwner) return false;
          return true;
        }).toList();

        if (filteredTimeline.isEmpty) {
          return _buildEmptyState(
            title: 'No recent activity',
            description:
                'Once you and your partners begin sharing availability, history will appear here.',
            icon: Icons.auto_graph_outlined,
          );
        }

        return ListView.separated(
          padding: listPadding,
          physics: const BouncingScrollPhysics(),
          itemCount: filteredTimeline.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) =>
              _buildTimelineTile(filteredTimeline[index]),
        );
    }
  }

  Widget _buildStatCard({
    required String label,
    required int value,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
          boxShadow: AppShadows.subtle,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSignalTile({
    required _SignalListEntry entry,
    required bool isScheduledView,
  }) {
    final signal = entry.signal;
    final isOwn = entry.isOwn;
    final now = DateTime.now();
    final ownerName = _ownerName(signal, isOwn: isOwn);
    final iconColor =
        isOwn ? AppColors.signalAvailable : AppColors.signalShared;
    final timeFormat = DateFormat('h:mm a');
    final dateFormat = DateFormat('EEE, MMM d');
    final startLabel =
        '${dateFormat.format(signal.startTime)} • ${timeFormat.format(signal.startTime)}';
    final isPerennial = signal.endTime.year >= now.year + 10;
    final endLabel = isPerennial
        ? 'Until turned off'
        : '${dateFormat.format(signal.endTime)} • ${timeFormat.format(signal.endTime)}';

    final remaining = signal.endTime.difference(now);
    final untilStart = signal.startTime.difference(now);

    final statusText = isScheduledView
        ? 'Starts in ${_friendlyDuration(untilStart)}'
        : SignalsService.isSignalActive(signal)
            ? 'Active • ${_friendlyDuration(remaining)} remaining'
            : 'Inactive';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.large),
        boxShadow: AppShadows.subtle,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isOwn ? Icons.wifi_tethering_rounded : Icons.people_outline,
                  color: iconColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            ownerName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: iconColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            signal.signalType.label,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: iconColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      statusText,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$startLabel → $endLabel',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textTertiary,
                      ),
                    ),
                    if (signal.message != null && signal.message!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '“${signal.message}”',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textLight,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildInfoChip(
                    label: isScheduledView
                        ? 'Opens ${DateFormat('h:mm a').format(signal.startTime)}'
                        : 'Remaining ${_friendlyDuration(remaining)}',
                    color: iconColor.withValues(alpha: 0.12),
                    textColor: iconColor,
                  ),
                  _buildInfoChip(
                    label: signal.duration?.label ?? 'Custom window',
                    color: Colors.white,
                    textColor: AppColors.textSecondary,
                  ),
                ],
              ),
              if (isOwn && !isScheduledView)
                TextButton(
                  onPressed: () => _cancelSignal(signal),
                  child: const Text('Cancel'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineTile(SignalTimelineEntry entry) {
    final color =
        entry.isOwner ? AppColors.signalAvailable : AppColors.signalShared;
    IconData icon;
    switch (entry.type) {
      case SignalTimelineType.created:
        icon = Icons.wifi_tethering_rounded;
        break;
      case SignalTimelineType.shared:
        icon = Icons.swap_horiz;
        break;
      case SignalTimelineType.extended:
        icon = Icons.update;
        break;
      case SignalTimelineType.ended:
        icon = Icons.stop_circle_outlined;
        break;
      case SignalTimelineType.reminder:
        icon = Icons.notifications_active_outlined;
        break;
    }

    final timestampLabel =
        DateFormat('EEE, MMM d • h:mm a').format(entry.timestamp);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppBorderRadius.large),
        boxShadow: AppShadows.subtle,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.headline,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (entry.subheadline != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    entry.subheadline!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  timestampLabel,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState({
    required String title,
    required String description,
    required IconData icon,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip({
    required String label,
    required Color color,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Future<void> _cancelSignal(AvailabilitySignal signal) async {
    await ref.read(activeSignalsProvider.notifier).cancelSignal(signal);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Signal ended early.')),
    );
  }

  String _ownerName(AvailabilitySignal signal, {required bool isOwn}) {
    if (isOwn) return 'You';
    return DevDataService.getMockUserById(signal.userId)?.displayName ??
        'Partner';
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
}

class _SignalListEntry {
  const _SignalListEntry({required this.signal, required this.isOwn});

  final AvailabilitySignal signal;
  final bool isOwn;
}
