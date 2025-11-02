part of 'widgets.dart';

/// Loading state with shimmer placeholders
class HomeLoadingState extends StatelessWidget {
  const HomeLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          LoadingShimmer(height: 40, width: 200),
          SizedBox(height: 24),
          LoadingShimmer(height: 150),
          SizedBox(height: 16),
          LoadingShimmer(height: 150),
          SizedBox(height: 16),
          LoadingShimmer(height: 200),
        ],
      ),
    );
  }
}
