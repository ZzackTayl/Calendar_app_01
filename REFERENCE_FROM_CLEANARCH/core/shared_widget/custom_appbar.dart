part of 'widgets.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final VoidCallback? onLeadingPressed;
  final Widget? trailing;
  final bool centerTitle;

  const CustomAppBar({
    super.key,
    required this.title,
    this.onLeadingPressed,
    this.trailing,
    this.centerTitle = true,
  });

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      centerTitle: centerTitle,
      leading: GestureDetector(
        onTap: onLeadingPressed ?? () => Navigator.pop(context),
        child: const Icon(Icons.arrow_back_ios, color: AppColors.textPrimary),
      ),
      actions: trailing != null ? [trailing!] : null,
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(56);
}
