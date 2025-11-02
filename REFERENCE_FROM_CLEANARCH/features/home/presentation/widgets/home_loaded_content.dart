part of 'widgets.dart';

/// Main content when home data is loaded
class HomeLoadedContent extends StatelessWidget {
  final HomeDataModel data;

  const HomeLoadedContent({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => context.read<HomeCubit>().refresh(),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const HomeHeader(),
            const SizedBox(height: 24),
            HomeCalendarCard(event: data.upcomingEvent),
            const SizedBox(height: 16),
            HomeEventsCard(count: data.upcomingEventsCount),
            const SizedBox(height: 16),
            HomeAvailabilityCard(availability: data.availability),
            const SizedBox(height: 16),
            const HomeSettingsCard(),
          ],
        ),
      ),
    );
  }
}
