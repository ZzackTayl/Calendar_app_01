part of 'widgets.dart';

/// Card displaying availability and signals
class HomeAvailabilityCard extends StatelessWidget {
  final AvailabilityModel availability;

  const HomeAvailabilityCard({super.key, required this.availability});

  @override
  Widget build(BuildContext context) {
    return HomeCard(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CustomText(
                  'Availability',
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.backgroundWhite,
                ),
                Icon(Icons.keyboard_arrow_down),
              ],
            ),
            const SizedBox(height: 8),
            CustomText(
              '${availability.signalsActive} signals active',
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                SignalChip(
                  label: '${availability.mineCount} mine',
                  color: AppColors.signalAvailable,
                ),
                const SizedBox(width: 12),
                SignalChip(
                  label: '${availability.connectionsCount} connections',
                  color: AppColors.signalShared,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
