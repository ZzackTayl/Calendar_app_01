import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/core/error/failures.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/entities/external_calendar_info.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/repositories/external_calendar_repository.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/import_external_events.dart';
import 'package:myorbit_calendar/features/external_calendar/presentation/cubit/calendar_migration_cubit.dart';
import 'package:myorbit_calendar/features/external_calendar/presentation/pages/calendar_migration_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  CalendarMigrationCubit buildCubit({
    Either<Failure, List<CalendarEvent>>? googleResult,
    Either<Failure, List<CalendarEvent>>? appleResult,
  }) {
    return CalendarMigrationCubit(
      importGoogleEvents: ImportExternalCalendarEvents(
        _FakeExternalCalendarRepository(result: googleResult),
      ),
      importAppleEvents: ImportExternalCalendarEvents(
        _FakeExternalCalendarRepository(result: appleResult),
      ),
    );
  }

  group('CalendarMigrationScreen', () {
    testWidgets(
        'GIVEN migration screen WHEN user completes all steps THEN configures import and starts migration',
        (tester) async {
      Future<void> invokeStepperContinue() async {
        final stepper = tester.widget<Stepper>(find.byType(Stepper));
        expect(stepper.onStepContinue, isNotNull);
        stepper.onStepContinue!.call();
        await tester.pumpAndSettle();
      }

      final cubit = buildCubit(googleResult: right(<CalendarEvent>[]));
      addTearDown(cubit.close);

      await tester.pumpApp(
        BlocProvider.value(
          value: cubit,
          child: const CalendarMigrationScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Choose a source'), findsOneWidget);
      expect(find.text('Calendar provider'), findsOneWidget);

      await invokeStepperContinue();
      expect(find.text('Match calendars'), findsOneWidget);

      // Toggle some options.
      await tester.tap(find.text('Include events from the past 12 months'));
      await tester.pump();
      await tester.tap(find.text('Import shared calendars'));
      await tester.pump();

      await invokeStepperContinue();
      expect(find.text('Review changes'), findsOneWidget);
      expect(find.textContaining('Summary'), findsOneWidget);

      await invokeStepperContinue();
    });

    // WCAG 2.1 Compliance Tests
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN calendar migration screen WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();

          // When
          final cubit = buildCubit(googleResult: right(<CalendarEvent>[]));
          addTearDown(cubit.close);

          await tester.pumpApp(
            BlocProvider.value(
              value: cubit,
              child: const CalendarMigrationScreen(),
            ),
          );
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 48x48 dp
          await expectLater(
            tester,
            meetsGuideline(androidTapTargetGuideline),
          );

          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN calendar migration screen WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();

          // When
          final cubit = buildCubit(googleResult: right(<CalendarEvent>[]));
          addTearDown(cubit.close);

          await tester.pumpApp(
            BlocProvider.value(
              value: cubit,
              child: const CalendarMigrationScreen(),
            ),
          );
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 44x44 pts
          await expectLater(
            tester,
            meetsGuideline(iOSTapTargetGuideline),
          );

          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN calendar migration screen WHEN rendered THEN all interactive elements have labels',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();

          // When
          final cubit = buildCubit(googleResult: right(<CalendarEvent>[]));
          addTearDown(cubit.close);

          await tester.pumpApp(
            BlocProvider.value(
              value: cubit,
              child: const CalendarMigrationScreen(),
            ),
          );
          await tester.pumpAndSettle();

          // Then - All interactive elements must have semantic labels
          await expectLater(
            tester,
            meetsGuideline(labeledTapTargetGuideline),
          );

          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN calendar migration screen WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();

          // When
          final cubit = buildCubit(googleResult: right(<CalendarEvent>[]));
          addTearDown(cubit.close);

          await tester.pumpApp(
            BlocProvider.value(
              value: cubit,
              child: const CalendarMigrationScreen(),
            ),
          );
          await tester.pumpAndSettle();

          // Then - Text must have 4.5:1 contrast (normal) or 3:1 (large 18pt+)
          await expectLater(
            tester,
            meetsGuideline(textContrastGuideline),
          );

          handle.dispose();
        },
      );
    });
  });
}

class _FakeExternalCalendarRepository implements ExternalCalendarRepository {
  _FakeExternalCalendarRepository({
    Either<Failure, List<CalendarEvent>>? result,
  }) : _result = result ?? right(<CalendarEvent>[]);

  final Either<Failure, List<CalendarEvent>> _result;

  @override
  Future<Either<Failure, List<CalendarEvent>>> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    return _result;
  }

  @override
  Future<Either<Failure, bool>> hasPermission() async => right(true);

  @override
  Future<Either<Failure, bool>> requestPermission() async => right(true);

  @override
  Future<Either<Failure, List<ExternalCalendarInfo>>> getCalendars() async =>
      right(<ExternalCalendarInfo>[]);

  @override
  bool get isPlatformSupported => true;
}
