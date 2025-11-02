part of 'pages.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    // Get actual user ID from your auth system
    final userId =
        sl<SharedPreferences>().getString('userId') ?? 'default_user_id';

    return BlocProvider(
      create: (context) => sl<HomeCubit>(param1: userId)..loadHomeData(),
      child: const HomeView(),
    );
  }
}
