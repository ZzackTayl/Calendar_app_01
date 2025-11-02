part of 'cubit.dart';

abstract class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object> get props => [];
}

class HomeInitial extends HomeState {}

class HomeLoading extends HomeState {}

class HomeRefreshing extends HomeState {
  // Add this state
  final HomeDataModel? previousData;

  const HomeRefreshing({this.previousData});

  @override
  List<Object> get props => [previousData ?? ''];
}

class HomeLoaded extends HomeState {
  final HomeDataModel data;

  const HomeLoaded({required this.data});

  @override
  List<Object> get props => [data];
}

class HomeError extends HomeState {
  final String message;

  const HomeError({required this.message});

  @override
  List<Object> get props => [message];
}
