part of 'config.dart';

class AppRoutes {
  AppRoutes._();

  static const String root = '/';
  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String verifyEmail = '/verify-email';
  static const String home = '/home';
  static const String main = '/main';
  static const String postDetail = 'post-detail/:postId';
  static const String search = '/search';
  static const String messages = '/messages';
  static const String chatDetail = 'chat/:chatId';
  static const String notifications = '/notifications';
  static const String addNotification = '/add-notification';
  static const String profile = '/profile';
  static const String editProfile = 'edit-profile';
  static const String myPosts = 'my-posts';
  static const String settings = 'settings';
  static const String createPost = '/create-post';
  static const String privacyPolicy = '/privacy-policy';
  static const String termsAndConditions = '/terms-and-conditions';
  static const String about = 'about';
}
