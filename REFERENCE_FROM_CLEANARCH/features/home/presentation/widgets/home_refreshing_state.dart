part of 'widgets.dart';

/// Refreshing state with shimmer overlay
class HomeRefreshingState extends StatelessWidget {
  final HomeDataModel? previousData;

  const HomeRefreshingState({super.key, this.previousData});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Show previous data
        if (previousData != null)
          HomeLoadedContent(data: previousData!)
        else
          const HomeLoadingState(),

        // Semi-transparent shimmer overlay
        Positioned.fill(
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.transparent,
                    Colors.white.withOpacity(0.1),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
              ),
              child: const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
