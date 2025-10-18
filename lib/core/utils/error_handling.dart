import 'package:flutter/material.dart';

/// Standardized error handling utilities for the application
class ErrorHandling {
  ErrorHandling._();

  /// Shows a standardized error snackbar
  static void showErrorSnackBar(
    BuildContext context,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    if (!context.mounted) return;

    final snackBar = SnackBar(
      content: Text(message),
      backgroundColor: Theme.of(context).colorScheme.error,
      action: actionLabel != null && onAction != null
          ? SnackBarAction(
              label: actionLabel,
              textColor: Theme.of(context).colorScheme.onError,
              onPressed: onAction,
            )
          : null,
    );

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(snackBar);
  }

  /// Shows a standardized success snackbar
  static void showSuccessSnackBar(
    BuildContext context,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    if (!context.mounted) return;

    final snackBar = SnackBar(
      content: Text(message),
      backgroundColor: Colors.green,
      action: actionLabel != null && onAction != null
          ? SnackBarAction(
              label: actionLabel,
              textColor: Colors.white,
              onPressed: onAction,
            )
          : null,
    );

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(snackBar);
  }

  /// Shows a standardized error dialog
  static Future<void> showErrorDialog(
    BuildContext context,
    String title,
    String message, {
    String confirmLabel = 'OK',
    VoidCallback? onConfirm,
  }) async {
    if (!context.mounted) return;

    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              onConfirm?.call();
            },
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }

  /// Shows a confirmation dialog
  static Future<bool> showConfirmationDialog(
    BuildContext context,
    String title,
    String message, {
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
    bool isDestructive = false,
  }) async {
    if (!context.mounted) return false;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelLabel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: isDestructive
                ? TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  )
                : null,
            child: Text(confirmLabel),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  /// Handles async operations with standardized error handling
  static Future<T?> handleAsyncOperation<T>(
    BuildContext context,
    Future<T> operation, {
    String? loadingMessage,
    String? errorMessage,
    VoidCallback? onSuccess,
    VoidCallback? onError,
  }) async {
    if (loadingMessage != null && context.mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 16),
              Text(loadingMessage),
            ],
          ),
        ),
      );
    }

    try {
      final result = await operation;

      if (loadingMessage != null && context.mounted) {
        Navigator.of(context).pop();
      }

      onSuccess?.call();
      return result;
    } catch (error) {
      if (loadingMessage != null && context.mounted) {
        Navigator.of(context).pop();
      }

      if (context.mounted) {
        showErrorSnackBar(
          context,
          errorMessage ?? 'An error occurred: ${error.toString()}',
        );
      }

      onError?.call();
      return null;
    }
  }
}

/// Extension for easier error handling in widgets
extension ErrorHandlingExtension on BuildContext {
  /// Shows an error snackbar
  void showError(String message, {String? actionLabel, VoidCallback? onAction}) {
    ErrorHandling.showErrorSnackBar(this, message, actionLabel: actionLabel, onAction: onAction);
  }

  /// Shows a success snackbar
  void showSuccess(String message, {String? actionLabel, VoidCallback? onAction}) {
    ErrorHandling.showSuccessSnackBar(this, message, actionLabel: actionLabel, onAction: onAction);
  }

  /// Shows an error dialog
  Future<void> showErrorDialog(String title, String message,
      {String confirmLabel = 'OK', VoidCallback? onConfirm}) {
    return ErrorHandling.showErrorDialog(this, title, message,
        confirmLabel: confirmLabel, onConfirm: onConfirm);
  }

  /// Shows a confirmation dialog
  Future<bool> showConfirmation(String title, String message,
      {String confirmLabel = 'Confirm',
      String cancelLabel = 'Cancel',
      bool isDestructive = false}) {
    return ErrorHandling.showConfirmationDialog(this, title, message,
        confirmLabel: confirmLabel, cancelLabel: cancelLabel, isDestructive: isDestructive);
  }
}

/// Standardized result type for operations that can fail
sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

class Failure<T> extends Result<T> {
  final String message;
  final Object? error;
  const Failure(this.message, [this.error]);
}

/// Extension for Result type
extension ResultExtension<T> on Result<T> {
  /// Returns true if the result is a success
  bool get isSuccess => this is Success<T>;

  /// Returns true if the result is a failure
  bool get isFailure => this is Failure<T>;

  /// Returns the data if success, null otherwise
  T? get dataOrNull => isSuccess ? (this as Success<T>).data : null;

  /// Returns the error message if failure, null otherwise
  String? get errorMessage => isFailure ? (this as Failure<T>).message : null;

  /// Executes a function based on the result type
  R when<R>({
    required R Function(T data) success,
    required R Function(String message, Object? error) failure,
  }) {
    return switch (this) {
      Success<T>(data: final data) => success(data),
      Failure<T>(message: final message, error: final error) => failure(message, error),
    };
  }
}
