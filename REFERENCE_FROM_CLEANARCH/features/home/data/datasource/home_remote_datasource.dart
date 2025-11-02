part of 'datasource.dart';

abstract class HomeRemoteDataSource {
  Future<HomeDataModel> getHomeData(String userId);
  Future<List<CalendarEventModel>> getUpcomingEvents(String userId);
  Future<AvailabilityModel> getAvailability(String userId);
  Future<int> getNotificationCount(String userId);
}
