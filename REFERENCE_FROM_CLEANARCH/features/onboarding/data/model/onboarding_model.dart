part of 'model.dart';

class OnboardingPageModel {
  final String title;
  final String description;
  final String? imagePath;
  final OnboardingStep step;

  const OnboardingPageModel({
    required this.title,
    required this.description,
    this.imagePath,
    required this.step,
  });
}
