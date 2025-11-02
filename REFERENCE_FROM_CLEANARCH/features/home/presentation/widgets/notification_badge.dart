part of 'widgets.dart';

/// Badge showing notification count
class NotificationBadge extends StatelessWidget {
  final int count;

  const NotificationBadge({super.key, required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: const BoxDecoration(
        color: AppColors.secondary,
        shape: BoxShape.circle,
      ),
      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
      child: Center(
        child: CustomText(
          count.toString(),
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }
}
