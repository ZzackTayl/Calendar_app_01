part of 'cubit.dart';

class HomeCubit extends Cubit<HomeState> {
  final HomeRepo repository;
  final String userId;

  HomeCubit({required this.repository, required this.userId})
    : super(HomeInitial());

  Future<void> loadHomeData() async {
    emit(HomeLoading());
    await _fetchHomeData();
  }

  Future<void> refresh() async {
    // If we're already loaded, preserve the previous data for shimmer effect
    if (state is HomeLoaded) {
      final currentData = (state as HomeLoaded).data;
      emit(HomeRefreshing(previousData: currentData));
    } else {
      emit(HomeLoading());
    }

    await _fetchHomeData();
  }

  Future<void> _fetchHomeData() async {
    try {
      final result = await repository.getHomeData(userId);
      result.fold(
        (error) => emit(HomeError(message: error)),
        (data) => emit(HomeLoaded(data: data)),
      );
    } catch (e) {
      emit(HomeError(message: 'Failed to load home data: $e'));
    }
  }
}
