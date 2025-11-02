part of 'widgets.dart';

class ProgressIndicator extends StatelessWidget {
  final int currentIndex;
  final int totalPages;

  const ProgressIndicator({
    super.key,
    required this.currentIndex,
    required this.totalPages,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        children: List.generate(
          totalPages,
          (index) => Expanded(
            child: Container(
              height: 4,
              margin: EdgeInsets.only(right: index < totalPages - 1 ? 8 : 0),
              decoration: BoxDecoration(
                color: index <= currentIndex
                    ? AppColors.primary
                    : AppColors.textSecondary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
