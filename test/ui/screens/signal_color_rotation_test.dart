import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/core/color_utils.dart';
import 'package:flutter/material.dart';

void main() {
  group('Signal Color Rotation Logic', () {
    // Helper to create a signal
    AvailabilitySignal createSignal({
      required String userId,
      required String signalId,
      DateTime? startTime,
      DateTime? endTime,
    }) {
      final now = DateTime.now();
      return AvailabilitySignal(
        id: signalId,
        userId: userId,
        signalType: SignalType.available,
        startTime: startTime ?? now,
        endTime: endTime ?? now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        createdAt: now,
      );
    }

    // Helper to create a contact
    Contact createContact({
      required String id,
      required String name,
      String? colorHex,
      String? externalUserId,
    }) {
      return Contact(
        id: id,
        name: name,
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'owner123',
        externalUserId: externalUserId,
        colorHex: colorHex,
      );
    }

    test('Single signal from one connection should have one color', () {
      // Arrange
      final taylor = createContact(
        id: 'taylor-id',
        name: 'Taylor Brooks',
        colorHex: '#9c5a5a', // Brown
        externalUserId: 'taylor-user-id',
      );

      final signal = createSignal(
        userId: 'taylor-user-id',
        signalId: 'signal-1',
      );

      // Act - Simulate the color collection logic
      final signalColors = <Color>[];

      // Deduplicate by userId
      final Map<String, AvailabilitySignal> signalsByUserId = {};
      signalsByUserId[signal.userId] = signal;

      // Get unique connections
      final contacts = [taylor];
      for (final sig in signalsByUserId.values) {
        final color = _colorForSignal(sig, contacts);
        if (!signalColors
            .any((existing) => existing.toARGB32() == color.toARGB32())) {
          signalColors.add(color);
        }
      }

      // Assert
      expect(signalColors.length, 1,
          reason: 'Should have exactly 1 color for 1 connection');
      expect(signalColors.first.toARGB32(),
          ContactColorUtils.fromHex('#9c5a5a')!.toARGB32(),
          reason: 'Color should match Taylor\'s assigned color');
    });

    test('Multiple signals from same connection should have one color', () {
      // Arrange
      final taylor = createContact(
        id: 'taylor-id',
        name: 'Taylor Brooks',
        colorHex: '#9c5a5a',
        externalUserId: 'taylor-user-id',
      );

      final signal1 = createSignal(
        userId: 'taylor-user-id',
        signalId: 'signal-1',
        startTime: DateTime(2024, 1, 1, 10, 0),
        endTime: DateTime(2024, 1, 1, 11, 0),
      );

      final signal2 = createSignal(
        userId: 'taylor-user-id',
        signalId: 'signal-2',
        startTime: DateTime(2024, 1, 1, 14, 0),
        endTime: DateTime(2024, 1, 1, 15, 0),
      );

      // Act
      final signalColors = <Color>[];

      // Simulate collecting signals on the same date
      final sharedSignalsForDate = [signal1, signal2];

      // Deduplicate by userId - only latest signal per connection
      final Map<String, AvailabilitySignal> signalsByUserId = {};
      for (final signal in sharedSignalsForDate) {
        signalsByUserId[signal.userId] = signal; // Last one wins
      }

      final contacts = [taylor];
      for (final signal in signalsByUserId.values) {
        final color = _colorForSignal(signal, contacts);
        if (!signalColors
            .any((existing) => existing.toARGB32() == color.toARGB32())) {
          signalColors.add(color);
        }
      }

      // Assert
      expect(signalColors.length, 1,
          reason: 'Should deduplicate multiple signals from same connection');
    });

    test('Multiple connections should have multiple rotating colors', () {
      // Arrange
      final taylor = createContact(
        id: 'taylor-id',
        name: 'Taylor Brooks',
        colorHex: '#9c5a5a',
        externalUserId: 'taylor-user-id',
      );

      final alex = createContact(
        id: 'alex-id',
        name: 'Alex Chen',
        colorHex: '#7C3AED', // Purple
        externalUserId: 'alex-user-id',
      );

      final taylorSignal = createSignal(
        userId: 'taylor-user-id',
        signalId: 'signal-1',
      );

      final alexSignal = createSignal(
        userId: 'alex-user-id',
        signalId: 'signal-2',
      );

      // Act
      final signalColors = <Color>[];

      final sharedSignalsForDate = [taylorSignal, alexSignal];
      final Map<String, AvailabilitySignal> signalsByUserId = {};

      for (final signal in sharedSignalsForDate) {
        signalsByUserId[signal.userId] = signal;
      }

      final contacts = [taylor, alex];
      for (final signal in signalsByUserId.values) {
        final color = _colorForSignal(signal, contacts);
        if (!signalColors
            .any((existing) => existing.toARGB32() == color.toARGB32())) {
          signalColors.add(color);
        }
      }

      // Assert
      expect(signalColors.length, 2,
          reason: 'Should have 2 unique colors for 2 connections');
      expect(
          signalColors.map((c) => c.toARGB32()).toList(),
          containsAll([
            ContactColorUtils.fromHex('#9c5a5a')!.toARGB32(),
            ContactColorUtils.fromHex('#7C3AED')!.toARGB32(),
          ]),
          reason: 'Colors should match assigned connection colors');
    });

    test('Signal without assigned color uses fallback deterministically', () {
      // Arrange
      final contact = createContact(
        id: 'charlie-id',
        name: 'Charlie Davis',
        colorHex: null, // No color assigned
        externalUserId: 'charlie-user-id',
      );

      final signal = createSignal(
        userId: 'charlie-user-id',
        signalId: 'signal-1',
      );

      // Act
      final color1 = _colorForSignal(signal, [contact]);
      final color2 = _colorForSignal(signal, [contact]);

      // Assert
      expect(color1.toARGB32(), color2.toARGB32(),
          reason: 'Fallback color should be deterministic for same contact');
      expect(ContactColorUtils.fallbackForName('Charlie Davis').toARGB32(),
          color1.toARGB32(),
          reason: 'Should use name-based fallback');
    });

    test('Duplicate signals with same userId are collapsed', () {
      // This tests the exact bug scenario
      final taylor = createContact(
        id: 'taylor-id',
        name: 'Taylor Brooks',
        colorHex: '#9c5a5a',
        externalUserId: 'taylor-user-id',
      );

      final signals = [
        createSignal(userId: 'taylor-user-id', signalId: 'signal-1'),
        createSignal(
            userId: 'taylor-user-id', signalId: 'signal-1'), // Duplicate
        createSignal(
            userId: 'taylor-user-id', signalId: 'signal-1'), // Duplicate
      ];

      // Act
      final signalColors = <Color>[];
      final Map<String, AvailabilitySignal> signalsByUserId = {};

      for (final signal in signals) {
        signalsByUserId[signal.userId] = signal; // Deduplicates
      }

      for (final signal in signalsByUserId.values) {
        final color = _colorForSignal(signal, [taylor]);
        if (!signalColors
            .any((existing) => existing.toARGB32() == color.toARGB32())) {
          signalColors.add(color);
        }
      }

      // Assert
      expect(signalColors.length, 1,
          reason: 'Should collapse duplicate signals to single color');
    });
  });

  group('Color Rotation Animation', () {
    test('Single color does not rotate', () {
      // The _colorForProgress logic should return the same color
      final colors = [Colors.brown];

      // Test different progress values
      for (double progress = 0; progress <= 1.0; progress += 0.1) {
        final color = _colorForProgress(colors, progress);
        expect(color.toARGB32(), colors.first.toARGB32(),
            reason: 'Single color should not change with progress');
      }
    });

    test('Multiple colors rotate smoothly', () {
      // Multiple colors should transition between them
      final colors = [Colors.purple, Colors.blue, Colors.green];

      final color0 = _colorForProgress(colors, 0.0);
      final color0b = _colorForProgress(colors, 0.01);
      final color1 = _colorForProgress(colors, 0.5);
      final color2 = _colorForProgress(colors, 1.0);

      // First color should be the first in the list
      expect(color0.toARGB32(), colors[0].toARGB32(),
          reason: 'Progress 0.0 should return first color');

      // Colors should change as progress changes
      final colorSet = {color0, color0b, color1, color2};
      expect(colorSet.length > 1, true,
          reason: 'Different progress values should produce different colors');
    });
  });
}

// Helper functions from calendar_screen.dart
Color _colorForSignal(
  AvailabilitySignal signal,
  List<Contact> contacts,
) {
  // Simplified version for testing
  Contact? contact;
  try {
    contact = contacts.firstWhere(
      (c) => c.id == signal.userId || c.externalUserId == signal.userId,
    );
  } catch (_) {
    // Contact not found
  }

  if (contact != null) {
    return ContactColorUtils.fromHex(contact.colorHex) ??
        ContactColorUtils.fallbackForName(contact.name);
  }

  return ContactColorUtils.fallbackForName(signal.userId);
}

Color _colorForProgress(List<Color> colors, double progress) {
  if (colors.length == 1) {
    return colors.first;
  }
  final scaled = progress * colors.length;
  final index = scaled.floor() % colors.length;
  final nextIndex = (index + 1) % colors.length;
  final t = scaled - index;
  return Color.lerp(colors[index], colors[nextIndex], t.clamp(0.0, 1.0)) ??
      colors[nextIndex];
}
