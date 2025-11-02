part of 'cubit.dart';

abstract class SplashState {}

class SplashInitial extends SplashState {}

class SplashLoading extends SplashState {}

class SplashCompleted extends SplashState {
  final bool shouldShowOnboarding;

  SplashCompleted({this.shouldShowOnboarding = false});
}
