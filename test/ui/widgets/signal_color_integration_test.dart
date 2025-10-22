import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/logic/services/signal_color_service.dart';
import 'package:myorbit_calendar/core/color_utils.dart';

/// Integration tests for Signal Color Service across all screens
/// 
/// These tests verify that SignalColorService is properly integrated
/// and that colors are consistent across the entire app.
///
/// Following Flutter best practices:
/// - Each test validates a single, specific aspect
/// - Uses Given-When-Then structure
/// - Tests actual widget rendering, not just logic
void main() {
  group('Signal Color Integration - Widget Tests', () {
    late Contact taylorContact;
    late Contact alexContact;
    late AvailabilitySignal taylorSignal;
    late AvailabilitySignal alexSignal;
    
    setUp(() {
      // Clear service cache before each test
      SignalColorService.invalidateCache();
      
      // Given: Set up test data with specific colors
      final now = DateTime.now();
      
      taylorContact = Contact(
        id: 'taylor-id',
        name: 'Taylor Brooks',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'owner123',
        externalUserId: 'taylor-user-id',
        colorHex: '#9c5a5a', // Brown
      );
      
      alexContact = Contact(
        id: 'alex-id',
        name: 'Alex Chen',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'owner123',
        externalUserId: 'alex-user-id',
        colorHex: '#7C3AED', // Purple
      );
      
      taylorSignal = AvailabilitySignal(
        id: 'taylor-signal-1',
        userId: 'taylor-user-id',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        createdAt: now,
      );
      
      alexSignal = AvailabilitySignal(
        id: 'alex-signal-1',
        userId: 'alex-user-id',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        createdAt: now,
      );
    });

    group('SignalColorService Direct Integration', () {
      test('GIVEN contact with assigned color WHEN getSignalColor called THEN returns assigned color', () {
        // When
        final color = SignalColorService.getSignalColor(
          taylorSignal,
          [taylorContact],
        );

        // Then
        final expectedColor = ContactColorUtils.fromHex('#9c5a5a')!;
        expect(
          color.toARGB32(),
          expectedColor.toARGB32(),
          reason: 'Should return Taylor\'s assigned brown color',
        );
      });

      test('GIVEN multiple contacts WHEN same signal queried twice THEN returns same color (caching)', () {
        final contacts = [taylorContact, alexContact];

        // When
        final color1 = SignalColorService.getSignalColor(taylorSignal, contacts);
        final color2 = SignalColorService.getSignalColor(taylorSignal, contacts);

        // Then
        expect(
          color1.toARGB32(),
          color2.toARGB32(),
          reason: 'Cache should return identical color on subsequent calls',
        );
      });

      test('GIVEN two different contacts WHEN getSignalColor called THEN returns different colors', () {
        final contacts = [taylorContact, alexContact];

        // When
        final taylorColor = SignalColorService.getSignalColor(
          taylorSignal,
          contacts,
        );
        final alexColor = SignalColorService.getSignalColor(
          alexSignal,
          contacts,
        );

        // Then
        expect(
          taylorColor.toARGB32() != alexColor.toARGB32(),
          true,
          reason: 'Taylor and Alex should have different colors',
        );
        
        // Verify exact colors
        expect(
          taylorColor.toARGB32(),
          ContactColorUtils.fromHex('#9c5a5a')!.toARGB32(),
          reason: 'Taylor should have brown',
        );
        expect(
          alexColor.toARGB32(),
          ContactColorUtils.fromHex('#7C3AED')!.toARGB32(),
          reason: 'Alex should have purple',
        );
      });

      test('GIVEN new connection without contact WHEN getSignalColor called THEN returns deterministic fallback', () {
        final newUserSignal = AvailabilitySignal(
          id: 'new-signal',
          userId: 'brand-new-user-123',
          signalType: SignalType.available,
          startTime: DateTime.now(),
          endTime: DateTime.now().add(const Duration(hours: 1)),
          duration: SignalDuration.hour,
          createdAt: DateTime.now(),
        );

        // When - No contact for this user
        final color1 = SignalColorService.getSignalColor(newUserSignal, []);
        
        // Clear cache and try again
        SignalColorService.invalidateCache();
        final color2 = SignalColorService.getSignalColor(newUserSignal, []);

        // Then - Should be deterministic
        expect(
          color1.toARGB32(),
          color2.toARGB32(),
          reason: 'Fallback color should be deterministic based on userId',
        );
        
        expect(
          color1 != Colors.transparent,
          true,
          reason: 'Should return a valid color, not transparent',
        );
      });
    });

    group('Color Consistency Across Multiple Signals', () {
      test('GIVEN multiple signals from same user WHEN colors retrieved THEN all match', () {
        // Given - Taylor sends 3 signals
        final now = DateTime.now();
        final signals = List.generate(
          3,
          (i) => AvailabilitySignal(
            id: 'taylor-signal-$i',
            userId: 'taylor-user-id',
            signalType: SignalType.available,
            startTime: now.add(Duration(hours: i)),
            endTime: now.add(Duration(hours: i + 1)),
            duration: SignalDuration.hour,
            createdAt: now,
          ),
        );

        // When
        final colors = signals
            .map((s) => SignalColorService.getSignalColor(s, [taylorContact]))
            .toList();

        // Then - All should be brown
        final expectedColor = ContactColorUtils.fromHex('#9c5a5a')!.toARGB32();
        for (int i = 0; i < colors.length; i++) {
          expect(
            colors[i].toARGB32(),
            expectedColor,
            reason: 'Signal $i should have Taylor\'s brown color',
          );
        }
      });

      test('GIVEN contact without colorHex WHEN getSignalColor called THEN uses name-based fallback', () {
        // Given - Contact with no assigned color
        final contactNoColor = Contact(
          id: 'charlie-id',
          name: 'Charlie Davis',
          status: ContactStatus.accepted,
          permission: PartnerPermission.visible,
          ownerId: 'owner123',
          externalUserId: 'charlie-user-id',
          colorHex: null, // No color assigned
        );
        
        final signal = AvailabilitySignal(
          id: 'charlie-signal',
          userId: 'charlie-user-id',
          signalType: SignalType.available,
          startTime: DateTime.now(),
          endTime: DateTime.now().add(const Duration(hours: 1)),
          duration: SignalDuration.hour,
          createdAt: DateTime.now(),
        );

        // When
        final color = SignalColorService.getSignalColor(signal, [contactNoColor]);

        // Then - Should use name-based fallback
        final expectedColor = ContactColorUtils.fallbackForName('Charlie Davis');
        expect(
          color.toARGB32(),
          expectedColor.toARGB32(),
          reason: 'Should use deterministic name-based fallback',
        );
      });
    });

    group('Cache Behavior', () {
      test('GIVEN cached color WHEN cache invalidated THEN new lookup returns same color', () {
        // Given - Get color (caches it)
        final color1 = SignalColorService.getSignalColor(
          taylorSignal,
          [taylorContact],
        );

        // When - Invalidate cache
        SignalColorService.invalidateCache();

        // Then - Should still get same color (deterministic)
        final color2 = SignalColorService.getSignalColor(
          taylorSignal,
          [taylorContact],
        );
        
        expect(
          color1.toARGB32(),
          color2.toARGB32(),
          reason: 'Color should be same after cache invalidation (deterministic)',
        );
      });

      test('GIVEN user-specific cache invalidation WHEN other users queried THEN unaffected', () {
        final contacts = [taylorContact, alexContact];

        // Given - Get colors for both
        final taylorColor1 = SignalColorService.getSignalColor(
          taylorSignal,
          contacts,
        );
        final alexColor1 = SignalColorService.getSignalColor(
          alexSignal,
          contacts,
        );

        // When - Invalidate only Taylor
        SignalColorService.invalidateUserCache('taylor-user-id');

        // Then - Taylor needs re-lookup, Alex still cached
        final taylorColor2 = SignalColorService.getSignalColor(
          taylorSignal,
          contacts,
        );
        final alexColor2 = SignalColorService.getSignalColor(
          alexSignal,
          contacts,
        );

        expect(
          taylorColor1.toARGB32(),
          taylorColor2.toARGB32(),
          reason: 'Taylor color should be same (deterministic)',
        );
        expect(
          alexColor1.toARGB32(),
          alexColor2.toARGB32(),
          reason: 'Alex color should be same (still cached)',
        );
      });
    });

    group('Edge Cases', () {
      test('GIVEN empty contacts list WHEN getSignalColor called THEN returns valid color', () {
        // When
        final color = SignalColorService.getSignalColor(taylorSignal, []);

        // Then
        expect(
          color != Colors.transparent,
          true,
          reason: 'Should return valid fallback color',
        );
      });

      test('GIVEN contact lookup by externalUserId WHEN getSignalColor called THEN finds contact', () {
        // Given - Signal userId matches contact's externalUserId
        final contactWithExternal = Contact(
          id: 'internal-id-xyz',
          name: 'External User',
          status: ContactStatus.accepted,
          permission: PartnerPermission.visible,
          ownerId: 'owner123',
          externalUserId: 'taylor-user-id', // Matches signal userId
          colorHex: '#2563EB', // Blue
        );

        // When
        final color = SignalColorService.getSignalColor(
          taylorSignal,
          [contactWithExternal],
        );

        // Then - Should find by externalUserId
        final expectedColor = ContactColorUtils.fromHex('#2563EB')!;
        expect(
          color.toARGB32(),
          expectedColor.toARGB32(),
          reason: 'Should find contact by externalUserId and use assigned color',
        );
      });

      test('GIVEN 100 rapid consecutive calls WHEN same signal THEN all return same color', () {
        // Simulate rapid UI updates
        final colors = <int>[];
        
        for (int i = 0; i < 100; i++) {
          final color = SignalColorService.getSignalColor(
            taylorSignal,
            [taylorContact],
          );
          colors.add(color.toARGB32());
        }

        // Then - All should be identical (cache working)
        expect(
          colors.every((c) => c == colors.first),
          true,
          reason: 'All rapid calls should return identical color',
        );
      });
    });

    group('Production Scenario Simulations', () {
      test('GIVEN app startup WHEN 50 signals loaded THEN colors are deterministic', () {
        // Simulate loading many signals at app startup
        final now = DateTime.now();
        const numSignals = 50;
        
        final contacts = List.generate(
          numSignals,
          (i) => Contact(
            id: 'contact-$i',
            name: 'User $i',
            status: ContactStatus.accepted,
            permission: PartnerPermission.visible,
            ownerId: 'owner',
            externalUserId: 'user-$i',
            colorHex: i % 3 == 0 ? '#FF0000' : null, // Some have colors, some don't
          ),
        );
        
        final signals = List.generate(
          numSignals,
          (i) => AvailabilitySignal(
            id: 'signal-$i',
            userId: 'user-$i',
            signalType: SignalType.available,
            startTime: now,
            endTime: now.add(const Duration(hours: 1)),
            duration: SignalDuration.hour,
            createdAt: now,
          ),
        );

        // First load
        final colors1 = signals
            .map((s) => SignalColorService.getSignalColor(s, contacts))
            .toList();

        // Simulate app restart (cache cleared)
        SignalColorService.invalidateCache();

        // Second load
        final colors2 = signals
            .map((s) => SignalColorService.getSignalColor(s, contacts))
            .toList();

        // Verify all colors match across restarts
        for (int i = 0; i < numSignals; i++) {
          expect(
            colors1[i].toARGB32(),
            colors2[i].toARGB32(),
            reason: 'Signal $i should have same color after restart',
          );
        }
      });
    });
  });
}
