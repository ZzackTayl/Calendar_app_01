part of 'repositories.dart';

class HomeRepositoryImpl implements HomeRepo {
  final HomeRemoteDataSource remoteDataSource;

  HomeRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<String, HomeDataModel>> getHomeData(String userId) async {
    try {
      final result = await remoteDataSource.getHomeData(userId);
      return Right(result);
    } on Exception catch (e) {
      return Left(e.toString());
    } catch (e) {
      return Left('Unexpected error: $e');
    }
  }

  @override
  Future<Either<String, List<CalendarEventModel>>> getUpcomingEvents(
    String userId,
  ) async {
    try {
      final result = await remoteDataSource.getUpcomingEvents(userId);
      return Right(result);
    } on Exception catch (e) {
      return Left(e.toString());
    } catch (e) {
      return Left('Unexpected error: $e');
    }
  }

  @override
  Future<Either<String, AvailabilityModel>> getAvailability(
    String userId,
  ) async {
    try {
      final result = await remoteDataSource.getAvailability(userId);
      return Right(result);
    } on Exception catch (e) {
      return Left(e.toString());
    } catch (e) {
      return Left('Unexpected error: $e');
    }
  }

  @override
  Future<Either<String, int>> getNotificationCount(String userId) async {
    try {
      final result = await remoteDataSource.getNotificationCount(userId);
      return Right(result);
    } on Exception catch (e) {
      return Left(e.toString());
    } catch (e) {
      return Left('Unexpected error: $e');
    }
  }
}
