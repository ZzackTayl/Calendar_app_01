import 'package:flutter/material.dart';

/// A widget to display when there is no data to show
class EmptyState extends StatelessWidget {
  final String message;
  final String? title;
  final IconData? icon;
  final Widget? action;

  const EmptyState({
    super.key,
    required this.message,
    this.title,
    this.icon,
    this.action,
  });

  /// Empty state for no events
  factory EmptyState.noEvents({VoidCallback? onAddEvent}) {
    return EmptyState(
      title: 'No events yet',
      message: 'Your calendar is empty. Start by adding your first event.',
      icon: Icons.event_outlined,
      action: onAddEvent != null
          ? FilledButton.icon(
              onPressed: onAddEvent,
              icon: const Icon(Icons.add),
              label: const Text('Add Event'),
            )
          : null,
    );
  }

  /// Empty state for no contacts
  factory EmptyState.noContacts({VoidCallback? onAddContact}) {
    return EmptyState(
      title: 'No contacts yet',
      message: 'Add contacts to share your availability with them.',
      icon: Icons.people_outline,
      action: onAddContact != null
          ? FilledButton.icon(
              onPressed: onAddContact,
              icon: const Icon(Icons.add),
              label: const Text('Add Contact'),
            )
          : null,
    );
  }

  /// Empty state for no notifications
  factory EmptyState.noNotifications() {
    return const EmptyState(
      title: 'No notifications',
      message: 'You\'re all caught up! Check back later for updates.',
      icon: Icons.notifications_none,
    );
  }

  /// Empty state for search with no results
  factory EmptyState.noSearchResults(String query) {
    return EmptyState(
      title: 'No results found',
      message: 'We couldn\'t find anything matching "$query"',
      icon: Icons.search_off,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon ?? Icons.inbox_outlined,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            if (title != null) ...[
              Text(
                title!,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: theme.colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
            ],
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              const SizedBox(height: 24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// A widget to display while data is loading
class LoadingState extends StatelessWidget {
  final String? message;

  const LoadingState({
    super.key,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}

/// A widget to display an error state with retry
class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final String? title;

  const ErrorState({
    super.key,
    required this.message,
    this.onRetry,
    this.title,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              title ?? 'Something went wrong',
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.onSurface,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                key: const Key('error_state_retry_button'),
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
