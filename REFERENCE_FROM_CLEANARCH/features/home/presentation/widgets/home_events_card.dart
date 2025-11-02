part of 'widgets.dart';

/// Card displaying events summary
class HomeEventsCard extends StatelessWidget {
  final int count;

  const HomeEventsCard({super.key, required this.count});

  @override
  Widget build(BuildContext context) {
    return HomeCard(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CustomText(
                  'Events',
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.backgroundWhite,
                ),
                SizedBox(height: 4),
                CustomText(
                  'Create and manage events',
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                CustomText(
                  '$count events this week',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.backgroundLight,
                ),
                const SizedBox(height: 4),
                CustomText(
                  '$count upcoming events',
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
