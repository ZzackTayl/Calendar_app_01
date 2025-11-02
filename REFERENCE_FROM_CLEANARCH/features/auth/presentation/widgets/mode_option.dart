part of 'widgets.dart';

class ModeOption extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const ModeOption({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic, // Smooth easing
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Animated downward slide
            AnimatedSlide(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              offset: selected ? const Offset(0, 0) : const Offset(0, -0.3),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: selected ? AppColors.primary : AppColors.textTertiary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
