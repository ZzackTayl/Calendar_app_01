part of 'repositories.dart';

abstract class HomeRepo {
  Future<Either<String, HomeDataModel>> getHomeData(String userId);
  Future<Either<String, List<CalendarEventModel>>> getUpcomingEvents(
    String userId,
  );
  Future<Either<String, AvailabilityModel>> getAvailability(String userId);
  Future<Either<String, int>> getNotificationCount(String userId);
}
