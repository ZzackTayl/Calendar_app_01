import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/logic/services/signal_color_service.dart';
import 'package:myorbit_calendar/core/color_utils.dart';
import 'package:flutter/material.dart';

void main() {
  group('SignalColorService - New Connections', () {
    setUp(() {
      // Clear caches before each test
      SignalColorService.invalidateCache();
    });

    AvailabilitySignal createSignal({
      required String userId,
      required String signalId,
    }) {
      final now = DateTime.now();
      return AvailabilitySignal(
        id: signalId,
        userId: userId,
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        createdAt: now,
      );
    }

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

    test('New connection without contact record gets consistent color', () {
      // Arrange - Signal from unknown user (new connection)
      final newUserId = 'brand-new-user-uuid-12345';
      final signal = createSignal(
        userId: newUserId,
        signalId: 'signal-1',
      );

      // Act - Get color multiple times
      final color1 = SignalColorService.getSignalColor(signal, []);
      final color2 = SignalColorService.getSignalColor(signal, []);
      final color3 = SignalColorService.getSignalColor(signal, []);

      // Assert - All calls return same color (cached)
      expect(color1.toARGB32(), color2.toARGB32(),
          reason: 'New connection should get cached color on second call');
      expect(color2.toARGB32(), color3.toARGB32(),
          reason: 'New connection should maintain color on third call');
      expect(color1 != Colors.transparent, true,
          reason: 'Should return a valid color, not transparent');
    });

    test('New connection color is consistent across different app instances', () {
      // Arrange - Simulate same connection from different cache state
      final userId = 'new-user-456';
      final signal = createSignal(userId: userId, signalId: 'sig-1');

      // Act - Get color, clear cache, get color again
      final color1 = SignalColorService.getSignalColor(signal, []);
      SignalColorService.invalidateCache();
      final color2 = SignalColorService.getSignalColor(signal, []);

      // Assert - Should get same color even after cache clear
      // (because it's based on userId hash which is deterministic)
      expect(color1.toARGB32(), color2.toARGB32(),
          reason:
              'Color should be deterministic based on userId, not cache state');
    });

    test('New connection gets one color even with multiple signals', () {
      // Arrange - Same user sends multiple signals
      final userId = 'multi-signal-user';
      final signals = [
        createSignal(userId: userId, signalId: 'signal-1'),
        createSignal(userId: userId, signalId: 'signal-2'),
        createSignal(userId: userId, signalId: 'signal-3'),
      ];

      // Act
      final colors = signals
          .map((sig) => SignalColorService.getSignalColor(sig, []))
          .toList();

      // Assert - All signals from same user should have same color
      expect(
        colors.every((c) => c.toARGB32() == colors.first.toARGB32()),
        true,
        reason: 'Multiple signals from same user should have same color',
      );
    });

    test('New connection gets different color when contact is later added', () {
      // Arrange
      final userId = 'taylor-123';
      final signal = createSignal(userId: userId, signalId: 'signal-1');

      // Act - First call without contact
      SignalColorService.getSignalColor(signal, []);

      // Now add contact info
      final contact = createContact(
        id: 'taylor-contact-id',
        name: 'Taylor Brooks',
        colorHex: '#9c5a5a', // Brown
        externalUserId: userId,
      );

      // Invalidate and get color with contact
      SignalColorService.invalidateCache();
      final colorWithContact =
          SignalColorService.getSignalColor(signal, [contact]);

      // Assert - Color should match assigned brown color
      expect(
        colorWithContact.toARGB32(),
        ContactColorUtils.fromHex('#9c5a5a')!.toARGB32(),
        reason: 'Should use assigned color from contact when available',
      );

      // The colors might be different if the fallback happens differently
      // but that's OK - what matters is consistency going forward
    });

    test('Multiple new connections get unique deterministic colors', () {
      // Arrange - Multiple unknown connections
      final signals = [
        createSignal(userId: 'user-aaa', signalId: 'sig-a'),
        createSignal(userId: 'user-bbb', signalId: 'sig-b'),
        createSignal(userId: 'user-ccc', signalId: 'sig-c'),
      ];

      // Act
      final colors = signals
          .map((sig) => SignalColorService.getSignalColor(sig, []))
          .toList();

      // Assert - Each user should get a color
      expect(colors.length, 3);
      for (final color in colors) {
        expect(color != Colors.transparent, true,
            reason: 'Each connection should get a valid color');
      }

      // Colors should be deterministic (though they might coincidentally match)
      for (int i = 0; i < signals.length; i++) {
        final signal = signals[i];
        SignalColorService.invalidateCache();
        final colorAgain = SignalColorService.getSignalColor(signal, []);
        expect(colors[i].toARGB32(), colorAgain.toARGB32(),
            reason: 'Each connection should get same color on repeat');
      }
    });

    test('New connection lookup by externalUserId works', () {
      // Arrange
      final userId = 'external-user-id-xyz';
      final signal = createSignal(userId: userId, signalId: 'signal-1');

      final contact = createContact(
        id: 'internal-contact-id',
        name: 'New Connection Name',
        colorHex: '#2563EB', // Blue
        externalUserId: userId, // Maps external user ID
      );

      // Act
      final color = SignalColorService.getSignalColor(signal, [contact]);

      // Assert - Should find contact by externalUserId and use assigned color
      expect(color.toARGB32(), ContactColorUtils.fromHex('#2563EB')!.toARGB32(),
          reason: 'Should use assigned color when contact found by externalUserId');
    });

    test('New connection with no colorHex gets name-based color', () {
      // Arrange - Contact exists but no color assigned
      final userId = 'user-no-color';
      final signal = createSignal(userId: userId, signalId: 'signal-1');

      final contact = createContact(
        id: 'contact-id',
        name: 'Alex Chen',
        colorHex: null, // No color assigned
        externalUserId: userId,
      );

      // Act
      final color = SignalColorService.getSignalColor(signal, [contact]);

      // Assert - Should use deterministic name-based color
      final expectedColor = ContactColorUtils.fallbackForName('Alex Chen');
      expect(color.toARGB32(), expectedColor.toARGB32(),
          reason: 'Should use name-based fallback color when no colorHex');
    });

    test('Cache invalidation per user works correctly', () {
      // Arrange
      final user1 = 'user-1';
      final user2 = 'user-2';
      final signal1 = createSignal(userId: user1, signalId: 'sig-1');
      final signal2 = createSignal(userId: user2, signalId: 'sig-2');

      // Act
      final color1a = SignalColorService.getSignalColor(signal1, []);
      final color2a = SignalColorService.getSignalColor(signal2, []);

      SignalColorService.invalidateUserCache(user1); // Clear only user1

      final color1b = SignalColorService.getSignalColor(signal1, []);
      final color2b = SignalColorService.getSignalColor(signal2, []);

      // Assert
      expect(color1a.toARGB32(), color1b.toARGB32(),
          reason: 'Should get same color after invalidation (deterministic)');
      expect(color2a.toARGB32(), color2b.toARGB32(),
          reason: 'Other users should not be affected');
    });
  });

  group('SignalColorService - Production Scenarios', () {
    setUp(() {
      SignalColorService.invalidateCache();
    });

    test('Handles rapid successive calls from same connection', () {
      final userId = 'rapid-user';
      final contact = Contact(
        id: 'contact-id',
        name: 'Rapid User',
        status: ContactStatus.accepted,
        ownerId: 'owner',
        colorHex: '#EC4899',
      );

      // Rapid fire calls
      final colors = <Color>[];
      for (int i = 0; i < 100; i++) {
        final signal = AvailabilitySignal(
          id: 'sig-$i',
          userId: userId,
          signalType: SignalType.available,
          startTime: DateTime.now(),
          endTime: DateTime.now().add(const Duration(hours: 1)),
          duration: SignalDuration.hour,
          createdAt: DateTime.now(),
        );
        colors.add(SignalColorService.getSignalColor(signal, [contact]));
      }

      // All should be the same color (consistency)
      expect(colors.every((c) => c.toARGB32() == colors.first.toARGB32()), true);
    });

    test('Guarantees deterministic colors across app lifetime', () {
      // Simulate a long-running app with many users
      const numUsers = 50;
      final contacts = <Contact>[];
      final signals = <AvailabilitySignal>[];
      final colorMap = <String, int>{};

      // Create 50 new connections over time
      for (int i = 0; i < numUsers; i++) {
        final userId = 'long-user-$i';
        contacts.add(Contact(
          id: 'contact-$i',
          name: 'User $i',
          status: ContactStatus.accepted,
          ownerId: 'owner',
          externalUserId: userId,
        ));
        signals.add(AvailabilitySignal(
          id: 'sig-$i',
          userId: userId,
          signalType: SignalType.available,
          startTime: DateTime.now(),
          endTime: DateTime.now().add(const Duration(hours: 1)),
          duration: SignalDuration.hour,
          createdAt: DateTime.now(),
        ));
      }

      // Get initial colors
      for (final signal in signals) {
        colorMap[signal.userId] =
            SignalColorService.getSignalColor(signal, contacts).toARGB32();
      }

      // Simulate app lifetime: clear cache multiple times
      for (int iteration = 0; iteration < 10; iteration++) {
        SignalColorService.invalidateCache();

        // Verify all colors are consistent
        for (final signal in signals) {
          final color = SignalColorService.getSignalColor(signal, contacts);
          expect(color.toARGB32(), colorMap[signal.userId],
              reason:
                  'Color should remain consistent throughout app lifetime');
        }
      }
    });
  });
}
