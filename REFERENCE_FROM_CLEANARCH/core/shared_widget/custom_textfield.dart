part of 'widgets.dart';

/// Custom text field widget with consistent styling.
///
/// Provides a standardized input component that:
/// - Follows the app's design system
/// - Supports validation
/// - Handles obscure text for passwords
/// - Works with both light and dark themes
/// - Matches the client's input field design
///
/// Usage:
/// ```dart
/// CustomTextField(
///   controller: emailController,
///   label: 'Email',
///   hint: 'Enter your email',
///   keyboardType: TextInputType.emailAddress,
///   validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
/// )
/// ```

class CustomTextField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final bool enabled;
  final TextInputAction? textInputAction;
  final Function(String)? onSubmitted;
  final String? Function(String?)? validator;

  const CustomTextField({
    super.key,
    required this.controller,
    required this.label,
    this.obscureText = false,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.enabled = true,
    this.textInputAction,
    this.onSubmitted,
    this.validator,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  bool _obscureText = true;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: widget.obscureText && _obscureText,
      keyboardType: widget.keyboardType,
      textCapitalization: widget.textCapitalization,
      enabled: widget.enabled,
      textInputAction: widget.textInputAction,
      onFieldSubmitted: widget.onSubmitted,
      validator: widget.validator,
      style: const TextStyle(fontSize: 16, color: AppColors.textPrimary),
      decoration: InputDecoration(
        hintText: widget.label,
        hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 16),
        filled: true,
        fillColor: AppColors.inputBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        suffixIcon: widget.obscureText
            ? IconButton(
                icon: Icon(
                  _obscureText ? Icons.visibility_off : Icons.visibility,
                  color: AppColors.textTertiary,
                ),
                onPressed: () {
                  setState(() {
                    _obscureText = !_obscureText;
                  });
                },
              )
            : null,
      ),
    );
  }
}
