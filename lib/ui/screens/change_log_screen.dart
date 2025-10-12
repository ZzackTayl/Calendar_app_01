import 'package:flutter/material.dart';

class ChangeLogScreen extends StatelessWidget {
  const ChangeLogScreen({super.key});

  static final List<_ChangeLogEntry> _entries = [
    _ChangeLogEntry(
      title: 'Calendar timeline updates',
      dateLabel: 'May 24, 2024',
      details: [
        'Improved agenda layout for overlapping events.',
        'Added partner color coding to quick actions.',
        'Smoothed vertical drag to navigate between weeks.',
      ],
      badgeColor: const Color(0xFF5B9FFF),
      typeLabel: 'Enhancement',
    ),
    _ChangeLogEntry(
      title: 'Partner management refresh',
      dateLabel: 'May 9, 2024',
      details: [
        'Introduced People & Groups screen for better collaboration.',
        'New permission tiers that clarify what each partner can see.',
        'Added pending invite indicators across the dashboard.',
      ],
      badgeColor: const Color(0xFF8B6C47),
      typeLabel: 'New',
    ),
    _ChangeLogEntry(
      title: 'Smarter notifications',
      dateLabel: 'April 26, 2024',
      details: [
        'Weekly digest emails now summarize changes across partners.',
        'Activity feed now collapses older updates automatically.',
      ],
      badgeColor: const Color(0xFF4BAE73),
      typeLabel: 'Improvement',
    ),
    _ChangeLogEntry(
      title: 'Bug fixes & polish',
      dateLabel: 'April 8, 2024',
      details: [
        'Fixed sync delay when reconnecting a calendar provider.',
        'Resolved issue where onboarding progress occasionally reset.',
        'Improved accessibility labels across primary buttons.',
      ],
      badgeColor: const Color(0xFFB85A5A),
      typeLabel: 'Fix',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
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
    );
  }
}

class _ChangeLogHeader extends StatelessWidget {
  const _ChangeLogHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 18),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFB8E6F5), Color(0xFFE8D4F2)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            color: Colors.black87,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Change log',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'The latest product improvements, fixes, and new features.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
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
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
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
                          color: entry.badgeColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          entry.typeLabel,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: entry.badgeColor,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        entry.dateLabel,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.black45,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    entry.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.black87,
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
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: Colors.black87,
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
    );
  }
}

class _TimelineBadge extends StatelessWidget {
  const _TimelineBadge({required this.color, required this.isFirst});

  final Color color;
  final bool isFirst;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 26,
      child: Column(
        children: [
          Container(
            width: 2,
            height: isFirst ? 0 : 24,
            color: isFirst ? Colors.transparent : color.withValues(alpha: 0.25),
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
              color: color.withValues(alpha: 0.25),
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
