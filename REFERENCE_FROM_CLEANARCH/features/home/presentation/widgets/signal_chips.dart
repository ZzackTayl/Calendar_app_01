part of 'widgets.dart';

/// Colored chip for displaying signal information
class SignalChip extends StatelessWidget {
  final String label;
  final Color color;

  const SignalChip({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: CustomText(
        label,
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: color,
      ),
    );
  }
}
