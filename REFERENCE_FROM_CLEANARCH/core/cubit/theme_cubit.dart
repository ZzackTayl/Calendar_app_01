part of 'cubit.dart';

class ThemeCubit extends Cubit<ThemeStatus> {
  ThemeCubit() : super(ThemeStatus.light);

  void toggleTheme() {
    emit(state == ThemeStatus.light ? ThemeStatus.dark : ThemeStatus.light);
  }

  void setLightTheme() => emit(ThemeStatus.light);
  void setDarkTheme() => emit(ThemeStatus.dark);

  bool get isDark => state == ThemeStatus.dark;
  Brightness get brightness =>
      state == ThemeStatus.dark ? Brightness.dark : Brightness.light;
}
