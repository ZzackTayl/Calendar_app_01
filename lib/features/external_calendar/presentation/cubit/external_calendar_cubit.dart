import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:myorbit_calendar/core/enums/app_state_status.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/entities/external_calendar_info.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/check_permission.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/get_external_calendars.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/import_external_events.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/is_platform_supported.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/request_permission.dart';

class ExternalCalendarState {
  final AppStateStatus status;
  final List<ExternalCalendarInfo> calendars;
  final List<CalendarEvent> importedEvents;
  final int importedCount;
  final String message;
  final bool hasPermission;

  const ExternalCalendarState({
    this.status = AppStateStatus.initial,
    this.calendars = const [],
    this.importedEvents = const [],
    this.importedCount = 0,
    this.message = '',
    this.hasPermission = false,
  });

  ExternalCalendarState copyWith({
    AppStateStatus? status,
    List<ExternalCalendarInfo>? calendars,
    List<CalendarEvent>? importedEvents,
    int? importedCount,
    String? message,
    bool? hasPermission,
  }) {
    return ExternalCalendarState(
      status: status ?? this.status,
      calendars: calendars ?? this.calendars,
      importedEvents: importedEvents ?? this.importedEvents,
      importedCount: importedCount ?? this.importedCount,
      message: message ?? this.message,
      hasPermission: hasPermission ?? this.hasPermission,
    );
  }
}

class ExternalCalendarCubit extends Cubit<ExternalCalendarState> {
  ExternalCalendarCubit({
    required CheckExternalCalendarPermission checkPermission,
    required RequestExternalCalendarPermission requestPermission,
    required GetExternalCalendars getExternalCalendars,
    required ImportExternalCalendarEvents importExternalEvents,
    required IsExternalCalendarPlatformSupported isPlatformSupported,
  })  : _checkPermission = checkPermission,
        _requestPermission = requestPermission,
        _getExternalCalendars = getExternalCalendars,
        _importExternalEvents = importExternalEvents,
        _isPlatformSupported = isPlatformSupported,
        super(const ExternalCalendarState());

  final CheckExternalCalendarPermission _checkPermission;
  final RequestExternalCalendarPermission _requestPermission;
  final GetExternalCalendars _getExternalCalendars;
  final ImportExternalCalendarEvents _importExternalEvents;
  final IsExternalCalendarPlatformSupported _isPlatformSupported;

  Future<void> checkPermission() async {
    final result = await _checkPermission();

    result.when(
      failure: (message, _) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: message,
        hasPermission: false,
      )),
      success: (hasPermission) => emit(state.copyWith(
        hasPermission: hasPermission,
        status: AppStateStatus.success,
      )),
    );
  }

  Future<void> requestPermission() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _requestPermission();

    result.when(
      success: (granted) => emit(state.copyWith(
        status: AppStateStatus.success,
        hasPermission: granted,
        message: granted ? 'Permission granted' : 'Permission denied',
      )),
      failure: (message, _) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: message,
        hasPermission: false,
      )),
    );
  }

  Future<void> loadCalendars() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _getExternalCalendars();

    result.when(
      failure: (message, _) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: message,
      )),
      success: (calendars) => emit(state.copyWith(
        status: AppStateStatus.success,
        calendars: calendars,
        message: 'Found ${calendars.length} calendars',
      )),
    );
  }

  Future<void> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _importExternalEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );

    result.when(
      failure: (message, _) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: message,
      )),
      success: (events) => emit(state.copyWith(
        status: AppStateStatus.success,
        importedEvents: events,
        importedCount: events.length,
        message: 'Imported ${events.length} events successfully',
      )),
    );
  }

  void reset() {
    emit(const ExternalCalendarState());
  }

  bool get isPlatformSupported => _isPlatformSupported();
}
