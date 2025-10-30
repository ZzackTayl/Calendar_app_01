import 'package:flutter/material.dart';

import 'accessibility/semantic_button.dart';

/// Custom "Send Invite" button that renders the branded asset directly.
class SendInviteButton extends StatelessWidget {
  const SendInviteButton({
    super.key,
    required this.semanticsLabel,
    this.semanticsHint,
    this.onPressed,
    this.height = 44,
    this.width,
    this.isLoading = false,
  });

  final VoidCallback? onPressed;
  final String semanticsLabel;
  final String? semanticsHint;
  final double height;
  final double? width;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(height / 2);
    final colorScheme = Theme.of(context).colorScheme;
    final enabled = !isLoading && onPressed != null;

    Widget child;
    if (isLoading) {
      child = SizedBox.square(
        dimension: height * 0.6,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
        ),
      );
    } else {
      child = Image.asset(
        'icons/send_invite_button.webp',
        fit: BoxFit.contain,
      );
    }

    return SemanticButton(
      label: semanticsLabel,
      hint: semanticsHint,
      enabled: enabled,
      onPressed: enabled ? onPressed : null,
      child: Material(
        color: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
        child: InkWell(
          onTap: enabled ? onPressed : null,
          customBorder: RoundedRectangleBorder(borderRadius: borderRadius),
          child: SizedBox(
            height: height,
            width: width,
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}
