part of 'widgets.dart';

class CustomSearchField extends StatelessWidget {
  final String hintText;
  final Function(String) onChanged;
  final TextEditingController? controller;
  final Widget? prefixIcon;
  final Widget? suffixIcon;

  const CustomSearchField({
    super.key,
    required this.hintText,
    required this.onChanged,
    this.controller,
    this.prefixIcon,
    this.suffixIcon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(color: Colors.grey[600], fontSize: 16),
          prefixIcon: prefixIcon ?? Icon(Icons.search, color: Colors.grey[600]),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
      ),
    );
  }
}
