import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/event.dart';
import '../../domain/repositories/external_calendar_repository.dart';

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
  final ExternalCalendarRepository repository;

  ExternalCalendarCubit({required this.repository})
      : super(const ExternalCalendarState());

  Future<void> checkPermission() async {
    final result = await repository.hasPermission();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
        hasPermission: false,
      )),
      (hasPermission) => emit(state.copyWith(
        hasPermission: hasPermission,
        status: AppStateStatus.success,
      )),
    );
  }

  Future<void> requestPermission() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.requestPermission();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
        hasPermission: false,
      )),
      (granted) => emit(state.copyWith(
        status: AppStateStatus.success,
        hasPermission: granted,
        message: granted ? 'Permission granted' : 'Permission denied',
      )),
    );
  }

  Future<void> loadCalendars() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getCalendars();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (calendars) => emit(state.copyWith(
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

    final result = await repository.importEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (events) => emit(state.copyWith(
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

  bool get isPlatformSupported => repository.isPlatformSupported;
}
