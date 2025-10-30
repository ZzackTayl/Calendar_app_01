import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import '../widgets/app_gradient_background.dart';

class ChangeLogScreen extends StatelessWidget {
  const ChangeLogScreen({super.key});

  static final List<_ChangeLogEntry> _entries = [
    const _ChangeLogEntry(
      title: 'Calendar timeline updates',
      dateLabel: 'May 24, 2024',
      details: [
        'Improved agenda layout for overlapping events.',
        'Added connection theme indicators to quick actions.',
        'Smoothed vertical drag to navigate between weeks.',
      ],
      badgeColor: Color(0xFF5B9FFF),
      typeLabel: 'Enhancement',
    ),
    const _ChangeLogEntry(
      title: 'Connection management refresh',
      dateLabel: 'May 9, 2024',
      details: [
        'Introduced My Connections screen for better collaboration.',
        'New permission tiers that clarify what each connection can see.',
        'Added pending invite indicators across the dashboard.',
      ],
      badgeColor: Color(0xFF8B6C47),
      typeLabel: 'New',
    ),
    const _ChangeLogEntry(
      title: 'Smarter notifications',
      dateLabel: 'April 26, 2024',
      details: [
        'Weekly digest emails now summarize changes across connections.',
        'Activity feed now collapses older updates automatically.',
      ],
      badgeColor: Color(0xFF4BAE73),
      typeLabel: 'Improvement',
    ),
    const _ChangeLogEntry(
      title: 'Bug fixes & polish',
      dateLabel: 'April 8, 2024',
      details: [
        'Fixed sync delay when reconnecting a calendar provider.',
        'Resolved issue where onboarding progress occasionally reset.',
        'Improved accessibility labels across primary buttons.',
      ],
      badgeColor: Color(0xFFB85A5A),
      typeLabel: 'Fix',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      body: AppGradientBackground(
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 64),
          child: Column(
            children: [
              const SizedBox(height: 4),
              const _ChangeLogHeader(),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
                  physics: const BouncingScrollPhysics(),
                  itemBuilder: (context, index) {
                    final entry = _entries[index];
                    return _ChangeLogCard(entry: entry, isFirst: index == 0);
                  },
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 20),
                  itemCount: _entries.length,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChangeLogHeader extends StatelessWidget {
  const _ChangeLogHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    Color blend(Color base) {
      return Color.alphaBlend(
        base.withValues(alpha: palette.isDark ? 0.32 : 0.16),
        palette.surface,
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            blend(colorScheme.primary),
            blend(colorScheme.secondary),
          ],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            color: palette.textPrimary,
            tooltip: 'Go back',
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SemanticHeading(
                  child: Text(
                    'Change log',
                    style: textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: palette.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'The latest product improvements, fixes, and new features.',
                  style: textTheme.bodyMedium?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChangeLogCard extends StatelessWidget {
  const _ChangeLogCard({required this.entry, required this.isFirst});

  final _ChangeLogEntry entry;
  final bool isFirst;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    Color chipBackground(Color accent) {
      return Color.alphaBlend(
        accent.withValues(alpha: palette.isDark ? 0.28 : 0.12),
        palette.surface,
      );
    }

    return SemanticCard(
      label: '${entry.typeLabel}: ${entry.title}',
      hint: 'Published on ${entry.dateLabel}',
      child: Container(
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: palette.cardShadow,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 12, 24),
              child: _TimelineBadge(color: entry.badgeColor, isFirst: isFirst),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(0, 24, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: chipBackground(entry.badgeColor),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            entry.typeLabel,
                            style: textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: entry.badgeColor,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          entry.dateLabel,
                          style: textTheme.labelSmall?.copyWith(
                            color: palette.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      entry.title,
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: palette.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: entry.details
                          .map(
                            (detail) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    margin:
                                        const EdgeInsets.only(top: 6, right: 8),
                                    decoration: BoxDecoration(
                                      color: entry.badgeColor,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      detail,
                                      style: textTheme.bodyMedium?.copyWith(
                                        color: palette.textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineBadge extends StatelessWidget {
  const _TimelineBadge({required this.color, required this.isFirst});

  final Color color;
  final bool isFirst;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final Color trackColor = Color.alphaBlend(
      color.withValues(alpha: palette.isDark ? 0.4 : 0.18),
      palette.background,
    );

    return SizedBox(
      width: 26,
      child: Column(
        children: [
          Container(
            width: 2,
            height: isFirst ? 0 : 24,
            color: isFirst ? Colors.transparent : trackColor,
          ),
          Container(
            width: 16,
            height: 16,
            margin: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          Expanded(
            child: Container(
              width: 2,
              color: trackColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChangeLogEntry {
  const _ChangeLogEntry({
    required this.title,
    required this.dateLabel,
    required this.details,
    required this.badgeColor,
    required this.typeLabel,
  });

  final String title;
  final String dateLabel;
  final List<String> details;
  final Color badgeColor;
  final String typeLabel;
}
