part of 'widgets.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceDark,
      body: const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      ),
    );
  }
}
