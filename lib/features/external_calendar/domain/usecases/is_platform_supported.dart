import '../repositories/external_calendar_repository.dart';

class IsExternalCalendarPlatformSupported {
  const IsExternalCalendarPlatformSupported(this._repository);

  final ExternalCalendarRepository _repository;

  bool call() => _repository.isPlatformSupported;
}
