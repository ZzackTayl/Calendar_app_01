import 'package:flutter/material.dart';

/// Accessible card wrapper that provides proper semantic labels for screen readers.
/// 
/// This widget wraps card-like widgets with appropriate semantics to ensure
/// screen readers can properly announce the card's content and purpose.
/// 
/// Example usage:
/// ```dart
/// SemanticCard(
///   label: 'Events card',
///   hint: '4 events this week, 5 upcoming',
///   isButton: true,
///   onTap: () => context.go('/events'),
///   child: Container(
///     // Card content
///   ),
/// )
/// ```
/// 
/// Screen reader will announce: "Events card, button. 4 events this week, 5 upcoming"
class SemanticCard extends StatelessWidget {
  /// The semantic label that describes the card's content
  final String label;
  
  /// Optional hint providing additional context or summary
  final String? hint;
  
  /// Whether this card is interactive (tappable)
  final bool isButton;
  
  /// The actual card widget to wrap
  final Widget child;
  
  /// Optional callback when card is tapped
  final VoidCallback? onTap;
  
  /// Whether to mark this as a header/section
  final bool isHeader;

  const SemanticCard({
    super.key,
    required this.label,
    this.hint,
    this.isButton = false,
    required this.child,
    this.onTap,
    this.isHeader = false,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: isButton,
      header: isHeader,
      excludeSemantics: true,
      child: onTap != null
          ? GestureDetector(
              onTap: onTap,
              child: child,
            )
          : child,
    );
  }
}

/// Accessible list item wrapper for activity/notification items.
/// 
/// Provides structured semantic information for list items including
/// actor, action, and timestamp.
/// 
/// Example usage:
/// ```dart
/// SemanticListItem(
///   label: 'Sam accepted your calendar invitation',
///   hint: '1 day ago',
///   child: ListTile(
///     // List item content
///   ),
/// )
/// ```
/// 
/// Screen reader will announce: "Sam accepted your calendar invitation. 1 day ago"
class SemanticListItem extends StatelessWidget {
  /// The main content/action description
  final String label;
  
  /// Additional context (usually timestamp)
  final String? hint;
  
  /// The actual list item widget
  final Widget child;
  
  /// Whether this item is interactive
  final bool isButton;
  
  /// Optional callback when item is tapped
  final VoidCallback? onTap;

  const SemanticListItem({
    super.key,
    required this.label,
    this.hint,
    required this.child,
    this.isButton = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: isButton,
      excludeSemantics: true,
      child: onTap != null
          ? GestureDetector(
              onTap: onTap,
              child: child,
            )
          : child,
    );
  }
}

/// Wrapper for decorative elements that should be hidden from screen readers.
/// 
/// Use this for purely visual elements like decorative icons, background shapes,
/// or ornamental images that don't convey meaningful information.
/// 
/// Example usage:
/// ```dart
/// DecorativeElement(
///   child: Container(
///     decoration: BoxDecoration(
///       // Decorative gradient or pattern
///     ),
///   ),
/// )
/// ```
class DecorativeElement extends StatelessWidget {
  /// The decorative widget to hide from screen readers
  final Widget child;

  const DecorativeElement({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: child,
    );
  }
}