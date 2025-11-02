part of 'widgets.dart';

/// Card displaying upcoming calendar event
class HomeCalendarCard extends StatelessWidget {
  final CalendarEventModel? event;

  const HomeCalendarCard({super.key, required this.event});

  @override
  Widget build(BuildContext context) {
    if (event == null) {
      return const HomeCard(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: CustomText(
            'No upcoming events',
            fontSize: 16,
            color: AppColors.textSecondary,
          ),
        ),
      );
    }

    return HomeCard(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CustomText(
              'Calendar',
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.backgroundLight,
            ),
            const SizedBox(height: 12),
            CustomText(
              event?.title ?? 'No Title',
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 4),
            CustomText(
              '${DateTimeFormatter.formatDateTime(event!.startTime)} - ${DateTimeFormatter.formatTime(event!.endTime, event!.timezone)}',
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 4),
            CustomText(
              event?.timezone ?? 'No Timezone',
              fontSize: 12,
              color: AppColors.textTertiary,
            ),
          ],
        ),
      ),
    );
  }
}
