import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../services/analytics_service.dart';

/// Centralized observer that logs BLoC/Cubit lifecycles and forwards errors
/// to Crashlytics and Sentry for improved diagnostics.
class AppBlocObserver extends BlocObserver {
  const AppBlocObserver();

  @override
  void onCreate(BlocBase<dynamic> bloc) {
    super.onCreate(bloc);
    _log('CREATE', bloc.runtimeType);
  }

  @override
  void onClose(BlocBase<dynamic> bloc) {
    _log('CLOSE', bloc.runtimeType);
    super.onClose(bloc);
  }

  @override
  void onEvent(Bloc<dynamic, dynamic> bloc, Object? event) {
    super.onEvent(bloc, event);
    _log('EVENT', bloc.runtimeType, detail: event);
    if (event != null) {
      unawaited(
        AnalyticsService.logBlocEvent(
          blocName: bloc.runtimeType.toString(),
          eventName: event.runtimeType.toString(),
        ),
      );
    }
  }

  @override
  void onChange(BlocBase<dynamic> bloc, Change<dynamic> change) {
    super.onChange(bloc, change);
    _log('CHANGE', bloc.runtimeType, detail: change);
  }

  @override
  void onTransition(
    Bloc<dynamic, dynamic> bloc,
    Transition<dynamic, dynamic> transition,
  ) {
    super.onTransition(bloc, transition);
    _log('TRANSITION', bloc.runtimeType, detail: transition);
  }

  @override
  void onError(
    BlocBase<dynamic> bloc,
    Object error,
    StackTrace stackTrace,
  ) {
    _log('ERROR', bloc.runtimeType, detail: error);
    _reportError(bloc, error, stackTrace);
    super.onError(bloc, error, stackTrace);
  }

  void _log(String type, Object blocType, {Object? detail}) {
    if (kDebugMode) {
      final detailText = detail == null ? '' : ' → $detail';
      debugPrint('[Bloc][$type] ${blocType.toString()}$detailText');
    }
  }

  Future<void> _reportError(
    BlocBase<dynamic> bloc,
    Object error,
    StackTrace stackTrace,
  ) async {
    try {
      if (Firebase.apps.isNotEmpty) {
        await FirebaseCrashlytics.instance.recordError(
          error,
          stackTrace,
          reason: 'Bloc error in ${bloc.runtimeType}',
          fatal: false,
        );
      }
    } catch (_) {
      // Swallow Crashlytics errors to avoid cascading failures.
    }

    if (Sentry.isEnabled) {
      await Sentry.captureException(
        error,
        stackTrace: stackTrace,
      );
    }
  }
}
