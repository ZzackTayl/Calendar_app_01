import 'package:flutter/material.dart';

/// Accessible text wrapper that provides proper semantic labels for screen readers.
/// 
/// This widget wraps text widgets with appropriate semantics to ensure
/// screen readers can properly announce text content with correct context.
/// 
/// Example usage:
/// ```dart
/// SemanticText(
///   label: 'Good morning',
///   isHeader: true,
///   child: Text(
///     'Good morning! 👋',
///     style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
///   ),
/// )
/// ```
/// 
/// Screen reader will announce: "Good morning, heading"
/// (The emoji is excluded from the semantic label for clarity)
class SemanticText extends StatelessWidget {
  /// The semantic label for the text
  /// If null, uses the text content from child
  final String? label;
  
  /// Optional hint providing additional context
  final String? hint;
  
  /// Whether this text is a header/heading
  final bool isHeader;
  
  /// The actual text widget to wrap
  final Widget child;
  
  /// Whether this text is live-updating (for dynamic content)
  /// When true, screen readers will announce changes
  final bool isLiveRegion;

  const SemanticText({
    super.key,
    this.label,
    this.hint,
    this.isHeader = false,
    required this.child,
    this.isLiveRegion = false,
  });

  @override
  Widget build(BuildContext context) {
    // If no custom label provided, let the text widget provide its own semantics
    if (label == null && !isHeader && !isLiveRegion) {
      return child;
    }

    return Semantics(
      label: label,
      hint: hint,
      header: isHeader,
      liveRegion: isLiveRegion,
      excludeSemantics: label != null, // Only exclude if we're providing a custom label
      child: child,
    );
  }
}

/// Wrapper for text that should be announced as a heading.
/// 
/// Use this for section titles, screen titles, and other heading text
/// to help screen reader users navigate the content structure.
/// 
/// Example usage:
/// ```dart
/// SemanticHeading(
///   child: Text(
///     'Recent Activity',
///     style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
///   ),
/// )
/// ```
class SemanticHeading extends StatelessWidget {
  /// The heading text widget
  final Widget child;
  
  /// Optional custom label (if different from displayed text)
  final String? label;

  const SemanticHeading({
    super.key,
    required this.child,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return SemanticText(
      label: label,
      isHeader: true,
      child: child,
    );
  }
}

/// Wrapper for live-updating text that screen readers should announce when changed.
/// 
/// Use this for dynamic content like timers, counters, or status messages
/// that update without user interaction.
/// 
/// Example usage:
/// ```dart
/// SemanticLiveText(
///   label: '$unreadCount unread notifications',
///   child: Text('$unreadCount'),
/// )
/// ```
class SemanticLiveText extends StatelessWidget {
  /// The semantic label for the live text
  final String label;
  
  /// The actual text widget
  final Widget child;

  const SemanticLiveText({
    super.key,
    required this.label,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SemanticText(
      label: label,
      isLiveRegion: true,
      child: child,
    );
  }
}

/// Wrapper for images with proper alt text for screen readers.
/// 
/// Use this for all meaningful images to ensure screen readers
/// can describe the image content to users.
/// 
/// Example usage:
/// ```dart
/// SemanticImage(
///   label: 'MyOrbit logo',
///   child: Image.asset('assets/images/myorbit_logo.png'),
/// )
/// ```
class SemanticImage extends StatelessWidget {
  /// The alt text describing the image
  final String label;
  
  /// The actual image widget
  final Widget child;
  
  /// Whether this is a decorative image (should be hidden from screen readers)
  final bool isDecorative;

  const SemanticImage({
    super.key,
    required this.label,
    required this.child,
    this.isDecorative = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isDecorative) {
      return ExcludeSemantics(child: child);
    }

    return Semantics(
      label: label,
      image: true,
      excludeSemantics: true,
      child: child,
    );
  }
}