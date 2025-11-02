part of 'widgets.dart';

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: AppColors.dividerColor)),
        const SizedBox(width: 16),
        Text(
          'or',
          style: TextStyle(color: AppColors.textTertiary, fontSize: 14),
        ),
        const SizedBox(width: 16),
        Expanded(child: Container(height: 1, color: AppColors.dividerColor)),
      ],
    );
  }
}
