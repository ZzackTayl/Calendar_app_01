import 'package:flutter/material.dart';
import '../../domain/availability_signal.dart';
import '../../domain/signal_share.dart';
import '../../domain/enums.dart';

/// Service for managing availability signals in MyOrbit
/// 
/// This service handles the "I'm available" signals that users can broadcast
/// to their partners. It manages signal creation, sharing, and visibility,
/// enabling the core availability feature that makes MyOrbit unique.
/// 
/// Key Concepts:
/// - Signals represent a user's availability for a specific time period
/// - Signals can be shared with specific partners
/// - Only active (non-expired) signals are shown
/// - Users can only see signals that have been shared with them
/// 
/// Signal Lifecycle:
/// 1. User creates a signal with type, duration, and optional message
/// 2. Signal is shared with selected partners via SignalShare records
/// 3. Partners can view active signals shared with them
/// 4. Signals automatically expire based on their end time
class SignalsService {
  // ============================================================================
  // SIGNAL CREATION & MANAGEMENT
  // ============================================================================
  
  /// Creates a new availability signal for a user
  /// 
  /// This is the primary method for creating signals. It handles duration
  /// calculations and sets up the signal with appropriate start/end times.
  /// 
  /// Parameters:
  /// - [userId]: ID of the user creating the signal
  /// - [type]: Type of signal (available, busy, flexible, unavailable)
  /// - [duration]: Duration preset (hour, hours2, hours4, day, custom)
  /// - [message]: Optional message to include with the signal
  /// - [customEndTime]: Required if duration is custom, ignored otherwise
  /// 
  /// Returns:
  /// - New AvailabilitySignal instance ready to be saved
  /// 
  /// Throws:
  /// - ArgumentError if duration is custom but customEndTime is null
  /// - ArgumentError if customEndTime is in the past
  /// 
  /// Example:
  /// ```dart
  /// final signal = SignalsService.createSignal(
  ///   'user123',
  ///   SignalType.available,
  ///   SignalDuration.hours2,
  ///   'Free for coffee!',
  /// );
  /// ```
  static AvailabilitySignal createSignal(
    String userId,
    SignalType type,
    SignalDuration duration,
    String? message, {
    DateTime? customEndTime,
  }) {
    // Validate inputs
    if (userId.isEmpty) {
      throw ArgumentError('userId cannot be empty');
    }
    
    final now = DateTime.now();
    final startTime = now;
    DateTime endTime;
    
    // Calculate end time based on duration
    if (duration == SignalDuration.custom) {
      if (customEndTime == null) {
        throw ArgumentError('customEndTime is required for custom duration');
      }
      if (customEndTime.isBefore(now)) {
        throw ArgumentError('customEndTime cannot be in the past');
      }
      endTime = customEndTime;
    } else {
      endTime = now.add(duration.toDuration());
    }
    
    // Generate a unique ID (in production, this would come from the database)
    final id = '${userId}_${now.millisecondsSinceEpoch}';
    
    return AvailabilitySignal(
      id: id,
      userId: userId,
      signalType: type,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      message: message,
      createdAt: now,
    );
  }
  
  /// Updates an existing signal with new information
  /// 
  /// Allows modifying the signal type and message. Note that timing
  /// information (start/end times) cannot be changed - create a new
  /// signal instead if timing needs to change.
  /// 
  /// Parameters:
  /// - [signal]: The existing signal to update
  /// - [type]: New signal type (optional)
  /// - [message]: New message (optional, pass empty string to clear)
  /// 
  /// Returns:
  /// - Updated AvailabilitySignal instance
  /// 
  /// Example:
  /// ```dart
  /// final updated = SignalsService.updateSignal(
  ///   existingSignal,
  ///   type: SignalType.flexible,
  ///   message: 'Might be available',
  /// );
  /// ```
  static AvailabilitySignal updateSignal(
    AvailabilitySignal signal, {
    SignalType? type,
    String? message,
  }) {
    return signal.copyWith(
      signalType: type,
      message: message,
    );
  }
  
  /// Cancels a signal by marking it as expired
  /// 
  /// This is a logical cancellation - it sets the end time to now,
  /// effectively expiring the signal immediately. The signal record
  /// remains in the database for history/analytics.
  /// 
  /// Parameters:
  /// - [signal]: The signal to cancel
  /// 
  /// Returns:
  /// - Updated signal with end time set to now
  /// 
  /// Note: In a real implementation, you might want to add a 'cancelled'
  /// flag to distinguish between naturally expired and cancelled signals.
  static AvailabilitySignal cancelSignal(AvailabilitySignal signal) {
    return signal.copyWith(
      endTime: DateTime.now(),
    );
  }
  
  /// Gets all active signals for a specific user
  /// 
  /// Returns only signals that are currently active (not expired).
  /// This is useful for showing a user's own active signals.
  /// 
  /// Parameters:
  /// - [userId]: ID of the user
  /// - [allSignals]: Complete list of signals to filter from
  /// 
  /// Returns:
  /// - List of active signals belonging to the user
  static List<AvailabilitySignal> getActiveSignals(
    String userId,
    List<AvailabilitySignal> allSignals,
  ) {
    if (userId.isEmpty || allSignals.isEmpty) {
      return [];
    }
    
    return allSignals
        .where((signal) => 
            signal.userId == userId && 
            isSignalActive(signal))
        .toList();
  }
  
  // ============================================================================
  // SIGNAL SHARING
  // ============================================================================
  
  /// Shares a signal with a specific user
  /// 
  /// Creates a SignalShare record that grants the specified user
  /// permission to view the signal.
  /// 
  /// Parameters:
  /// - [signalId]: ID of the signal to share
  /// - [sharedWithUserId]: ID of the user to share with
  /// - [sharedByUserId]: ID of the user doing the sharing
  /// 
  /// Returns:
  /// - New SignalShare instance ready to be saved
  /// 
  /// Throws:
  /// - ArgumentError if any ID is empty
  /// 
  /// Example:
  /// ```dart
  /// final share = SignalsService.shareSignalWithUser(
  ///   signal.id,
  ///   'partner123',
  ///   currentUserId,
  /// );
  /// ```
  static SignalShare shareSignalWithUser(
    String signalId,
    String sharedWithUserId,
    String sharedByUserId,
  ) {
    // Validate inputs
    if (signalId.isEmpty) {
      throw ArgumentError('signalId cannot be empty');
    }
    if (sharedWithUserId.isEmpty) {
      throw ArgumentError('sharedWithUserId cannot be empty');
    }
    if (sharedByUserId.isEmpty) {
      throw ArgumentError('sharedByUserId cannot be empty');
    }
    
    // Generate unique ID
    final now = DateTime.now();
    final id = '${signalId}_${sharedWithUserId}_${now.millisecondsSinceEpoch}';
    
    return SignalShare(
      id: id,
      signalId: signalId,
      sharedWithUserId: sharedWithUserId,
      sharedByUserId: sharedByUserId,
      createdAt: now,
    );
  }
  
  /// Shares a signal with multiple partners at once
  /// 
  /// Convenience method for sharing with multiple users. Creates a
  /// SignalShare record for each partner.
  /// 
  /// Parameters:
  /// - [signalId]: ID of the signal to share
  /// - [partnerIds]: List of partner user IDs to share with
  /// - [sharedByUserId]: ID of the user doing the sharing
  /// 
  /// Returns:
  /// - List of SignalShare instances, one per partner
  /// 
  /// Example:
  /// ```dart
  /// final shares = SignalsService.shareSignalWithPartners(
  ///   signal.id,
  ///   ['partner1', 'partner2', 'partner3'],
  ///   currentUserId,
  /// );
  /// ```
  static List<SignalShare> shareSignalWithPartners(
    String signalId,
    List<String> partnerIds,
    String sharedByUserId,
  ) {
    if (signalId.isEmpty || partnerIds.isEmpty || sharedByUserId.isEmpty) {
      return [];
    }
    
    return partnerIds
        .map((partnerId) => shareSignalWithUser(
              signalId,
              partnerId,
              sharedByUserId,
            ))
        .toList();
  }
  
  /// Gets all share records for a specific signal
  /// 
  /// Returns all SignalShare records associated with a signal,
  /// showing who the signal has been shared with.
  /// 
  /// Parameters:
  /// - [signalId]: ID of the signal
  /// - [allShares]: Complete list of shares to filter from
  /// 
  /// Returns:
  /// - List of SignalShare records for this signal
  static List<SignalShare> getSignalShares(
    String signalId,
    List<SignalShare> allShares,
  ) {
    if (signalId.isEmpty || allShares.isEmpty) {
      return [];
    }
    
    return allShares
        .where((share) => share.signalId == signalId)
        .toList();
  }
  
  /// Checks if a user has permission to view a signal
  /// 
  /// A user can view a signal if:
  /// 1. They created the signal (they're the owner), OR
  /// 2. The signal has been shared with them via a SignalShare record
  /// 
  /// Parameters:
  /// - [signal]: The signal to check
  /// - [userId]: ID of the user trying to view
  /// - [shares]: List of SignalShare records for this signal
  /// 
  /// Returns:
  /// - `true` if the user can view the signal
  /// - `false` otherwise
  static bool canUserViewSignal(
    AvailabilitySignal signal,
    String userId,
    List<SignalShare> shares,
  ) {
    if (userId.isEmpty) {
      return false;
    }
    
    // Owner can always view their own signals
    if (signal.userId == userId) {
      return true;
    }
    
    // Check if signal has been shared with this user
    return shares.any((share) => 
        share.signalId == signal.id && 
        share.sharedWithUserId == userId);
  }
  
  // ============================================================================
  // SIGNAL QUERIES
  // ============================================================================
  
  /// Gets all signals that have been shared with a specific user
  /// 
  /// Returns signals from other users that have been shared with the
  /// specified user. Does not include the user's own signals.
  /// 
  /// Parameters:
  /// - [userId]: ID of the user
  /// - [allSignals]: Complete list of signals
  /// - [allShares]: Complete list of signal shares
  /// 
  /// Returns:
  /// - List of signals shared with this user
  static List<AvailabilitySignal> getSignalsSharedWithUser(
    String userId,
    List<AvailabilitySignal> allSignals,
    List<SignalShare> allShares,
  ) {
    if (userId.isEmpty || allSignals.isEmpty) {
      return [];
    }
    
    // Get all shares where this user is the recipient
    final userShares = allShares
        .where((share) => share.sharedWithUserId == userId)
        .toList();
    
    if (userShares.isEmpty) {
      return [];
    }
    
    // Get the signal IDs that have been shared with this user
    final sharedSignalIds = userShares
        .map((share) => share.signalId)
        .toSet();
    
    // Return the actual signals
    return allSignals
        .where((signal) => sharedSignalIds.contains(signal.id))
        .toList();
  }
  
  /// Gets all active signals for a user (both owned and shared)
  /// 
  /// This is the main method for displaying signals in the UI. It returns
  /// all active signals that the user can see, including their own signals
  /// and signals shared with them.
  /// 
  /// Parameters:
  /// - [userId]: ID of the user
  /// - [allSignals]: Complete list of signals
  /// - [allShares]: Complete list of signal shares
  /// 
  /// Returns:
  /// - List of active signals visible to this user
  static List<AvailabilitySignal> getActiveSignalsForUser(
    String userId,
    List<AvailabilitySignal> allSignals,
    List<SignalShare> allShares,
  ) {
    if (userId.isEmpty || allSignals.isEmpty) {
      return [];
    }
    
    // Get user's own active signals
    final ownSignals = getActiveSignals(userId, allSignals);
    
    // Get active signals shared with user
    final sharedSignals = getSignalsSharedWithUser(
      userId,
      allSignals,
      allShares,
    ).where((signal) => isSignalActive(signal)).toList();
    
    // Combine and return (remove duplicates if any)
    final allUserSignals = [...ownSignals, ...sharedSignals];
    final uniqueSignals = <String, AvailabilitySignal>{};
    
    for (final signal in allUserSignals) {
      uniqueSignals[signal.id] = signal;
    }
    
    return uniqueSignals.values.toList();
  }
  
  /// Checks if a signal is currently active
  /// 
  /// A signal is active if the current time is between its start and end times.
  /// 
  /// Parameters:
  /// - [signal]: The signal to check
  /// 
  /// Returns:
  /// - `true` if the signal is currently active
  /// - `false` if expired or not yet started
  static bool isSignalActive(AvailabilitySignal signal) {
    final now = DateTime.now();
    return now.isAfter(signal.startTime) && now.isBefore(signal.endTime);
  }
  
  /// Gets the remaining time for an active signal
  /// 
  /// Calculates how much time is left before the signal expires.
  /// 
  /// Parameters:
  /// - [signal]: The signal to check
  /// 
  /// Returns:
  /// - Duration remaining if signal is active
  /// - null if signal is expired or not yet started
  static Duration? getSignalTimeRemaining(AvailabilitySignal signal) {
    if (!isSignalActive(signal)) {
      return null;
    }
    
    final now = DateTime.now();
    return signal.endTime.difference(now);
  }
  
  // ============================================================================
  // UI HELPERS
  // ============================================================================
  
  /// Gets a user-friendly label for a signal type
  /// 
  /// Parameters:
  /// - [type]: The SignalType enum value
  /// 
  /// Returns:
  /// - Human-readable string like "Available", "Busy", etc.
  static String getSignalTypeLabel(SignalType type) {
    return type.label;
  }
  
  /// Gets a detailed description of what a signal type means
  /// 
  /// Useful for tooltips, help text, or selection screens.
  /// 
  /// Parameters:
  /// - [type]: The SignalType enum value
  /// 
  /// Returns:
  /// - Detailed explanation string
  static String getSignalTypeDescription(SignalType type) {
    switch (type) {
      case SignalType.available:
        return 'You\'re free and available to connect or meet up.';
      case SignalType.busy:
        return 'You\'re occupied and not available right now.';
      case SignalType.flexible:
        return 'You might be available depending on the activity.';
      case SignalType.unavailable:
        return 'You\'re explicitly unavailable and shouldn\'t be contacted.';
    }
  }
  
  /// Gets the color associated with a signal type
  /// 
  /// Returns a Flutter Color object for consistent UI theming.
  /// 
  /// Parameters:
  /// - [type]: The SignalType enum value
  /// 
  /// Returns:
  /// - Color object for this signal type
  static Color getSignalTypeColor(SignalType type) {
    final hexColor = type.colorHex;
    // Remove the # and parse as hex
    final hexValue = hexColor.replaceAll('#', '');
    return Color(int.parse('FF$hexValue', radix: 16));
  }
  
  /// Gets a user-friendly label for a signal duration
  /// 
  /// Parameters:
  /// - [duration]: The SignalDuration enum value
  /// 
  /// Returns:
  /// - Human-readable string like "1 hour", "2 hours", etc.
  static String getSignalDurationLabel(SignalDuration duration) {
    return duration.label;
  }
  
  /// Formats remaining time in a human-readable way
  /// 
  /// Converts a Duration into a friendly string like "1h 23m left"
  /// or "45m left" for display in the UI.
  /// 
  /// Parameters:
  /// - [remaining]: The duration to format
  /// 
  /// Returns:
  /// - Formatted string like "1h 23m left", "45m left", or "< 1m left"
  /// 
  /// Example:
  /// ```dart
  /// final remaining = Duration(hours: 1, minutes: 23);
  /// final formatted = SignalsService.formatSignalTimeRemaining(remaining);
  /// // Returns: "1h 23m left"
  /// ```
  static String formatSignalTimeRemaining(Duration remaining) {
    if (remaining.isNegative) {
      return 'Expired';
    }
    
    final hours = remaining.inHours;
    final minutes = remaining.inMinutes.remainder(60);
    
    if (hours > 0) {
      if (minutes > 0) {
        return '${hours}h ${minutes}m left';
      }
      return '${hours}h left';
    }
    
    if (minutes > 0) {
      return '${minutes}m left';
    }
    
    return '< 1m left';
  }
  
  /// Gets all available signal types
  /// 
  /// Useful for building UI selection lists.
  /// 
  /// Returns:
  /// - List of all SignalType enum values
  static List<SignalType> getAllSignalTypes() {
    return SignalType.values;
  }
  
  /// Gets all available signal durations
  /// 
  /// Useful for building UI selection lists.
  /// 
  /// Returns:
  /// - List of all SignalDuration enum values
  static List<SignalDuration> getAllSignalDurations() {
    return SignalDuration.values;
  }
  
  /// Gets signal type options with labels, descriptions, and colors
  /// 
  /// Convenience method for building rich UI elements.
  /// 
  /// Returns:
  /// - Map of signal type to a map containing 'label', 'description', and 'color'
  static Map<SignalType, Map<String, dynamic>> getSignalTypeOptions() {
    return {
      for (var type in SignalType.values)
        type: {
          'label': getSignalTypeLabel(type),
          'description': getSignalTypeDescription(type),
          'color': getSignalTypeColor(type),
        }
    };
  }
  
  /// Gets signal duration options with labels
  /// 
  /// Convenience method for building duration selection UI.
  /// 
  /// Returns:
  /// - Map of duration to label string
  static Map<SignalDuration, String> getSignalDurationOptions() {
    return {
      for (var duration in SignalDuration.values)
        duration: getSignalDurationLabel(duration),
    };
  }
  
  /// Validates that a signal configuration is valid
  /// 
  /// Checks that the signal has valid timing and required fields.
  /// 
  /// Parameters:
  /// - [signal]: The signal to validate
  /// 
  /// Returns:
  /// - `true` if the signal is valid
  /// - `false` if there are validation issues
  static bool isValidSignal(AvailabilitySignal signal) {
    // Check required fields
    if (signal.id.isEmpty || signal.userId.isEmpty) {
      return false;
    }
    
    // Check timing
    if (signal.endTime.isBefore(signal.startTime)) {
      return false;
    }
    
    // Check that custom duration has reasonable timing
    if (signal.duration == SignalDuration.custom) {
      final duration = signal.endTime.difference(signal.startTime);
      // Custom duration should be at least 1 minute and at most 7 days
      if (duration.inMinutes < 1 || duration.inDays > 7) {
        return false;
      }
    }
    
    return true;
  }
}