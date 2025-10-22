import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import '../../domain/availability_signal.dart';
import '../../domain/contact.dart';
import '../../core/color_utils.dart';
import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';

/// Service for consistently resolving signal colors to connections
/// 
/// This service guarantees that:
/// 1. The same connection always gets the same color
/// 2. New connections without contact records get consistent colors
/// 3. Colors are deterministic across all views and updates
class SignalColorService {
  // Cache to avoid redundant lookups
  static final Map<String, Color> _colorCache = {};
  
  // Map to store signal.userId → contact name for consistent fallback
  static final Map<String, String> _userNameCache = {};

  /// Get deterministic color for a signal, guaranteed to be consistent
  /// 
  /// Priority:
  /// 1. Contact record with assigned colorHex
  /// 2. Contact record name (deterministic hash-based color)
  /// 3. Cached name from previous lookup
  /// 4. As last resort, use userId as fallback (consistent across app)
  static Color getSignalColor(
    AvailabilitySignal signal,
    List<Contact> contacts,
  ) {
    // Check cache first
    if (_colorCache.containsKey(signal.userId)) {
      return _colorCache[signal.userId]!;
    }

    final color = _resolveColor(signal, contacts);
    
    // Cache for consistency on subsequent calls
    _colorCache[signal.userId] = color;
    
    return color;
  }

  /// Private method to resolve color with fallback logic (synchronous)
  static Color _resolveColor(
    AvailabilitySignal signal,
    List<Contact> contacts,
  ) {
    // If current user, return special color
    if (signal.userId ==
        (SupabaseService.currentUser?.id ?? '')) {
      return AppColors.signalAvailable;
    }

    // Try to find contact by userId
    final contact = _findContact(signal.userId, contacts);
    
    if (contact != null) {
      // Cache the name for consistent fallback
      _userNameCache[signal.userId] = contact.name;
      
      // Use assigned color if available
      if (contact.colorHex != null) {
        final parsedColor = ContactColorUtils.fromHex(contact.colorHex);
        if (parsedColor != null) {
          return parsedColor;
        }
      }
      
      // Fall back to name-based color
      return ContactColorUtils.fallbackForName(contact.name);
    }

    // Contact not found - try to look up from database
    final cachedName = _userNameCache[signal.userId];
    if (cachedName != null) {
      // Use previously cached name
      developer.log(
        '[SignalColorService] Using cached name for ${signal.userId}: $cachedName',
        name: 'SignalColorService',
      );
      return ContactColorUtils.fallbackForName(cachedName);
    }

    // Last resort: use userId for color determinism
    // This ensures the same person always gets the same color even if contact data is missing
    developer.log(
      '[SignalColorService] Using userId for fallback color: ${signal.userId}',
      name: 'SignalColorService',
    );
    return ContactColorUtils.fallbackForName(signal.userId);
  }

  /// Find contact by userId, checking both id and externalUserId
  static Contact? _findContact(
    String userId,
    List<Contact> contacts,
  ) {
    try {
      for (final contact in contacts) {
        if (contact.id == userId || contact.externalUserId == userId) {
          return contact;
        }
      }
    } catch (e) {
      developer.log(
        '[SignalColorService] Error finding contact: $e',
        name: 'SignalColorService',
      );
    }
    return null;
  }

  /// Clear caches when contacts are refreshed
  static void invalidateCache() {
    _colorCache.clear();
    developer.log(
      '[SignalColorService] Cache invalidated',
      name: 'SignalColorService',
    );
  }

  /// Clear specific user's cache when their contact changes
  static void invalidateUserCache(String userId) {
    _colorCache.remove(userId);
    developer.log(
      '[SignalColorService] Invalidated cache for $userId',
      name: 'SignalColorService',
    );
  }
}
